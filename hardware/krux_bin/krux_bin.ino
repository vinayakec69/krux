#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#include <ESP32Servo.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ============================================================
//  CREDENTIALS — must match the app's .env exactly
// ============================================================
#define WIFI_SSID       "krish"
#define WIFI_PASSWORD   "okkrishfine"
#define API_KEY         "AIzaSyDUs4meTrtJKgNLy-YvRiufFX5NjymB-SM"
#define DATABASE_URL    "krux-ee1df-default-rtdb.firebaseio.com"
#define BIN_ID          "KRUX_BIN_001"

// ============================================================
//  FIREBASE OBJECTS
// ============================================================
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ============================================================
//  OLED
// ============================================================
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ============================================================
//  HARDWARE PINS
// ============================================================
const int PIN_SENSOR_ADC  = 34;
const int PIN_INDUCTIVE   = 25;
const int PIN_PAN_SERVO_1 = 19;
const int PIN_PAN_SERVO_2 = 18;
const int PIN_TILT_SERVO  = 23;
const int PIN_IR_SENSOR   = 27;
const int PIN_LASER       = 5;

Servo panServo1;
Servo panServo2;
Servo tiltServo;

// ============================================================
//  ANGLES
// ============================================================
const int TILT_FLAT   = 90;
const int TILT_DROP   = 150;
const int ANGLE_HOME  = 90;
const int ANGLE_HOME_2= 0;
const int ANGLE_PET   = 0;
const int ANGLE_PP    = 90;
const int ANGLE_HDPE  = 180;
const int ANGLE_METAL = 359;

// ============================================================
//  OPTICAL THRESHOLDS
// ============================================================
const int THRESH_NO_PAPER = 0;
const int THRESH_HDPE_MAX = 600;
const int THRESH_PP_MAX   = 1700;

// ============================================================
//  TIMING
// ============================================================
unsigned long lastPrintTime     = 0;
unsigned long lastFirebaseCheck = 0;
bool firebaseReady              = false;
bool appConnected               = false;

// ============================================================
//  OLED HELPERS
// ============================================================
void oledMsg(String line1, String line2 = "", String line3 = "") {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(line1);
  if (line2.length() > 0) { display.setCursor(0, 20); display.println(line2); }
  if (line3.length() > 0) { display.setCursor(0, 40); display.println(line3); }
  display.display();
}

void oledBig(String line1, String line2 = "") {
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(0, 10);
  display.println(line1);
  if (line2.length() > 0) { display.setCursor(0, 35); display.println(line2); }
  display.display();
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n========== KRUX BIN BOOTING ==========");

  pinMode(PIN_LASER, OUTPUT);
  pinMode(PIN_IR_SENSOR, INPUT);
  pinMode(PIN_INDUCTIVE, INPUT);

  // ---- OLED ----
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("ERROR: OLED init failed!");
  }
  display.setTextColor(WHITE);
  oledBig("BOOTING..");

  // ---- WIFI ----
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  oledMsg("WiFi connecting..", WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi CONNECTED!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    oledMsg("WiFi CONNECTED!", WiFi.localIP().toString());
    delay(1000);
  } else {
    Serial.println("\nWiFi FAILED!");
    oledBig("WiFi", "FAILED!");
    // Keep running anyway so hardware still works standalone
  }

  // ---- FIREBASE ----
  Serial.println("Connecting to Firebase...");
  oledMsg("Firebase..", "Connecting...");

  config.api_key      = API_KEY;
  config.database_url = DATABASE_URL;

  // Anonymous sign-up — REQUIRES "Anonymous" sign-in to be enabled
  // in Firebase Console → Authentication → Sign-in method → Anonymous → ENABLE
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase Auth: OK (anonymous)");
    oledMsg("Firebase..", "Auth OK!");
  } else {
    Serial.print("Firebase Auth ERROR: ");
    Serial.println(config.signer.signupError.message.c_str());
    oledMsg("Firebase..", "Auth FAILED!", "Enable Anonymous Auth");
  }

  config.token_status_callback = tokenStatusCallback;

  // Reduce SSL buffer to prevent RAM crash
  fbdo.setBSSLBufferSize(2048, 1024);
  fbdo.setResponseSize(1024);

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // ---- SERVOS (init and detach) ----
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  panServo1.setPeriodHertz(50);
  panServo1.attach(PIN_PAN_SERVO_1, 500, 2400);
  panServo1.write(ANGLE_HOME);
  delay(500);
  panServo1.detach();

  panServo2.setPeriodHertz(50);
  panServo2.attach(PIN_PAN_SERVO_2, 500, 2400);
  panServo2.write(ANGLE_HOME_2);
  delay(500);
  panServo2.detach();

  tiltServo.setPeriodHertz(50);
  tiltServo.attach(PIN_TILT_SERVO, 500, 2400);
  tiltServo.write(TILT_FLAT);
  delay(500);
  tiltServo.detach();

  analogSetAttenuation(ADC_11db);

  Serial.println("========== SETUP COMPLETE ==========");
  Serial.println("Waiting for app connection on path:");
  Serial.println("  /active_sessions/KRUX_BIN_001/status");
  Serial.println("====================================\n");
  oledMsg("READY - WAITING", "for app to", "connect...");
}

// ============================================================
//  SENSOR READING
// ============================================================
int getSmoothedReading() {
  digitalWrite(PIN_LASER, HIGH);
  delayMicroseconds(500);
  int sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(PIN_SENSOR_ADC);
  }
  digitalWrite(PIN_LASER, LOW);
  return sum / 10;
}

// ============================================================
//  OLED STATUS DISPLAY
// ============================================================
void updateOLED(String material, String footprint, int angle) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("ECO-SORT PRO V5.0");
  display.drawLine(0, 10, 128, 10, WHITE);

  if (material == "no paper") {
    display.setTextSize(2);
    display.setCursor(0, 30);
    display.println("No plastic");
  } else {
    display.setTextSize(1);
    display.setCursor(0, 20);
    display.print("TYPE: ");
    display.setTextSize(2);
    display.println(material);
    display.setTextSize(1);
    display.setCursor(0, 45);
    display.print("CO2: ");
    display.println(footprint);
    display.setCursor(0, 55);
    display.print("Ang: ");
    display.print(angle);
    display.print(" deg");
  }
  display.display();
}

// ============================================================
//  NOTIFY APP AFTER DROP
// ============================================================
void notifyAppDropCompleted(int coins) {
  if (Firebase.ready()) {
    String path = "/drop_events/" + String(BIN_ID);
    FirebaseJson json;
    json.set("status", "confirmed");
    json.set("krux_earned", coins);
    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
      Serial.println(">> Firebase: Drop event sent to app!");
    } else {
      Serial.print(">> Firebase drop event ERROR: ");
      Serial.println(fbdo.errorReason());
    }
  }
}

// ============================================================
//  MAIN LOOP
// ============================================================
void loop() {
  int sensorValue = getSmoothedReading();
  int irState     = digitalRead(PIN_IR_SENSOR);
  bool metalDetected = (digitalRead(PIN_INDUCTIVE) == HIGH);

  String currentMaterial  = "no paper";
  String currentFootprint = "--";
  String isMetalString    = "no";
  int targetAngle = ANGLE_HOME;
  int kruxCoins   = 0;

  // ---- Classification ----
  if (metalDetected) {
    currentMaterial = "METAL"; currentFootprint = "1.85 kg CO2/kg";
    isMetalString = "yes"; targetAngle = ANGLE_METAL; kruxCoins = 5;
  } else if (sensorValue <= THRESH_NO_PAPER) {
    currentMaterial = "no paper"; currentFootprint = "--";
    targetAngle = ANGLE_HOME; kruxCoins = 0;
  } else if (sensorValue <= THRESH_HDPE_MAX) {
    currentMaterial = "HDPE"; currentFootprint = "1.19 MTCO2E/Ton";
    targetAngle = ANGLE_HDPE; kruxCoins = 12;
  } else if (sensorValue <= THRESH_PP_MAX) {
    currentMaterial = "PP"; currentFootprint = "0.84 kg CO2/kg";
    targetAngle = ANGLE_PP; kruxCoins = 11;
  } else {
    currentMaterial = "PET"; currentFootprint = "2.15 kg CO2/kg";
    targetAngle = ANGLE_PET; kruxCoins = 15;
  }

  // ---- Periodic serial print ----
  if (millis() - lastPrintTime > 2000) {
    Serial.print("ADC:");
    Serial.print(sensorValue);
    Serial.print(" | Type:");
    Serial.print(currentMaterial);
    Serial.print(" | Firebase.ready()=");
    Serial.println(Firebase.ready() ? "YES" : "NO");

    if (!appConnected) {
      updateOLED("WAITING", "for app..", 0);
    } else {
      updateOLED(currentMaterial, currentFootprint, targetAngle);
    }
    lastPrintTime = millis();
  }

  // ============================================================
  //  FIREBASE HANDSHAKE — Check every 3 seconds
  //  App writes:  /active_sessions/KRUX_BIN_001  { status: "requesting_connection", ... }
  //  We reply:    /active_sessions/KRUX_BIN_001  { status: "connected" }
  // ============================================================
  if (millis() > 5000 && millis() - lastFirebaseCheck > 3000) {
    lastFirebaseCheck = millis();

    if (Firebase.ready()) {
      if (!firebaseReady) {
        firebaseReady = true;
        Serial.println(">> Firebase is READY. Polling for app connection...");
      }

      // READ the status field
      String statusPath = "/active_sessions/" + String(BIN_ID) + "/status";

      if (Firebase.RTDB.getString(&fbdo, statusPath.c_str())) {
        String status = fbdo.stringData();
        Serial.print(">> Firebase status = \"");
        Serial.print(status);
        Serial.println("\"");

        // ---- APP IS REQUESTING CONNECTION ----
        if (status == "requesting_connection") {
          Serial.println("");
          Serial.println("=============================================");
          Serial.println("  >>> APP CONNECTED TO BIN SUCCESSFULLY! <<<");
          Serial.println("=============================================");
          Serial.println("");

          // Show on OLED
          oledBig("APP", "CONNECTED!");

          // Reply back so the app unlocks its camera
          if (Firebase.RTDB.setString(&fbdo, statusPath.c_str(), "connected")) {
            Serial.println(">> Replied 'connected' to app. Handshake complete!");
          } else {
            Serial.print(">> ERROR replying to app: ");
            Serial.println(fbdo.errorReason());
          }

          appConnected = true;
          delay(2000); // Hold the message on screen
        }
      } else {
        // This is NORMAL if no app has connected yet (path doesn't exist)
        Serial.print(">> Firebase read: ");
        Serial.println(fbdo.errorReason());
      }
    } else {
      Serial.println(">> Firebase NOT ready yet...");
    }
  }

  // ============================================================
  //  ACTUATION — Only when IR triggers and material detected
  // ============================================================
  if (irState == LOW && currentMaterial != "no paper") {

    if (targetAngle <= 180) {
      panServo1.attach(PIN_PAN_SERVO_1, 500, 2400);
      panServo1.write(targetAngle);
      delay(1000);
      panServo1.detach();

      tiltServo.attach(PIN_TILT_SERVO, 500, 2400);
      tiltServo.write(TILT_DROP);
      delay(1000);
      tiltServo.write(TILT_FLAT);
      delay(600);
      tiltServo.detach();

      panServo1.attach(PIN_PAN_SERVO_1, 500, 2400);
      panServo1.write(ANGLE_HOME);
      delay(800);
      panServo1.detach();
    } else {
      int servo2MappedAngle = targetAngle - 180;
      panServo2.attach(PIN_PAN_SERVO_2, 500, 2400);
      panServo2.write(servo2MappedAngle);
      delay(1000);
      panServo2.detach();

      tiltServo.attach(PIN_TILT_SERVO, 500, 2400);
      tiltServo.write(TILT_DROP);
      delay(1000);
      tiltServo.write(TILT_FLAT);
      delay(600);
      tiltServo.detach();

      panServo2.attach(PIN_PAN_SERVO_2, 500, 2400);
      panServo2.write(ANGLE_HOME_2);
      delay(800);
      panServo2.detach();
    }

    notifyAppDropCompleted(kruxCoins);
    delay(1500);
  }
}