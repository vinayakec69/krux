#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <ESP32Servo.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

/* --- FIREBASE & WIFI CREDENTIALS --- */
#define WIFI_SSID "krish"
#define WIFI_PASSWORD "okkrishfine"
#define API_KEY "AIzaSyDUs4meTrtJKgNLy-YvRiufFX5NjymB-SM"
#define DATABASE_URL "https://krux-ee1df-default-rtdb.firebaseio.com"
#define BIN_ID "KRUX_BIN_001"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// --- OLED SETUP ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// --- PIN DEFINITIONS ---
const int PIN_SENSOR_ADC = 34;
const int PIN_INDUCTIVE = 25;
const int PIN_PAN_SERVO_1 = 19;
const int PIN_PAN_SERVO_2 = 18;
const int PIN_TILT_SERVO = 23;
const int PIN_IR_SENSOR = 27;
const int PIN_LASER = 5;

Servo panServo1;
Servo panServo2;
Servo tiltServo;

// --- PAN & TILT ANGLES ---
const int TILT_FLAT = 90;
const int TILT_DROP = 150;
const int ANGLE_HOME = 90;
const int ANGLE_HOME_2 = 0;
const int ANGLE_PET = 0;
const int ANGLE_PP = 90;
const int ANGLE_HDPE = 180;
const int ANGLE_METAL = 359;

// --- OPTICAL THRESHOLDS ---
const int THRESH_NO_PAPER = 0;
const int THRESH_HDPE_MAX = 600;
const int THRESH_PP_MAX = 1700;

unsigned long lastPrintTime = 0;
unsigned long lastHandshakeCheck = 0;
String currentSessionId = "";
bool binActive = false;

void setup() {
  Serial.begin(115200);

  pinMode(PIN_LASER, OUTPUT);
  pinMode(PIN_IR_SENSOR, INPUT);
  pinMode(PIN_INDUCTIVE, INPUT);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("OLED failed"));
  }
  display.setTextColor(WHITE);
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(10, 20);
  display.println("BOOTING...");
  display.display();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.println("Connecting WiFi...");
  display.display();

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi!");

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase Auth Successful");
  } else {
    Serial.printf("Firebase Auth Error: %s\n", config.signer.signupError.message.c_str());
  }

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

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

  updateOLED("READY", "--", ANGLE_HOME);
  Serial.println("System Ready. Waiting for handshake...");
}

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

void updateOLED(String material, String footprint, int angle) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("KRUX BIN V5.0");
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
    display.print("Target Ang: ");
    display.print(angle);
    display.print(" deg");
  }
  display.display();
}

void notifyAppDropCompleted(int coins) {
  if (Firebase.ready()) {
    String path = "/drop_events/" + String(BIN_ID);
    String jsonStr = "{\"status\":\"confirmed\",\"krux_earned\":" + String(coins) + "}";

    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), jsonStr.c_str())) {
      Serial.println("Firebase: App successfully notified!");
    } else {
      Serial.println("Firebase Error: " + fbdo.errorReason());
    }
  }
}

void handleHandshake() {
  if (!Firebase.ready()) return;

  String path = "/bins/" + String(BIN_ID);

  if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
    String json = fbdo.to<String>();

    if (json.indexOf("\"status\":\"requesting_connection\"") > 0) {
      int sessionStart = json.indexOf("\"session_id\":\"");
      if (sessionStart > 0) {
        sessionStart += 14;
        int sessionEnd = json.indexOf("\"", sessionStart);
        currentSessionId = json.substring(sessionStart, sessionEnd);
      }

      String response = "{\"status\":\"connected\",\"session_id\":\"" + currentSessionId + "\",\"timestamp\":" + String(millis()) + "}";
      
      if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), response.c_str())) {
        Serial.println("[Handshake] Responded with connected: " + currentSessionId);
        binActive = true;
        updateOLED("CONNECTED", "Waiting...", ANGLE_HOME);
      } else {
        Serial.println("[Handshake] Failed to write response: " + fbdo.errorReason());
      }
    }
    else if (json.indexOf("\"status\":\"connected\"") > 0 && json.indexOf(currentSessionId) > 0) {
      binActive = true;
    }
    else {
      binActive = false;
      currentSessionId = "";
    }
  }
}

void loop() {
  if (millis() - lastHandshakeCheck > 500) {
    handleHandshake();
    lastHandshakeCheck = millis();
  }

  if (!binActive) {
    return;
  }

  int sensorValue = getSmoothedReading();
  int irState = digitalRead(PIN_IR_SENSOR);
  bool metalDetected = (digitalRead(PIN_INDUCTIVE) == HIGH);

  String currentMaterial = "no paper";
  String currentFootprint = "--";
  String isMetalString = "no";
  int targetAngle = ANGLE_HOME;
  int kruxCoins = 0;

  if (metalDetected) {
    currentMaterial = "METAL";
    currentFootprint = "1.85 kg CO2/kg";
    isMetalString = "yes";
    targetAngle = ANGLE_METAL;
    kruxCoins = 5;
  }
  else if (sensorValue <= THRESH_NO_PAPER) {
    currentMaterial = "no paper";
    currentFootprint = "--";
    targetAngle = ANGLE_HOME;
    kruxCoins = 0;
  }
  else if (sensorValue > THRESH_NO_PAPER && sensorValue <= THRESH_HDPE_MAX) {
    currentMaterial = "HDPE";
    currentFootprint = "1.19 MTCO2E/Ton";
    targetAngle = ANGLE_HDPE;
    kruxCoins = 12;
  }
  else if (sensorValue > THRESH_HDPE_MAX && sensorValue <= THRESH_PP_MAX) {
    currentMaterial = "PP";
    currentFootprint = "0.84 kg CO2/kg";
    targetAngle = ANGLE_PP;
    kruxCoins = 11;
  }
  else {
    currentMaterial = "PET";
    currentFootprint = "2.15 kg CO2/kg";
    targetAngle = ANGLE_PET;
    kruxCoins = 15;
  }

  if (millis() - lastPrintTime > 400) {
    Serial.print("Current adcvalue:\"");
    Serial.print(sensorValue);
    Serial.print("\", plastic type :\"");
    Serial.print(currentMaterial);
    Serial.print("\", angle of rotation:\"");
    Serial.print(targetAngle);
    Serial.print("\", metal :\"");
    Serial.print(isMetalString);
    Serial.print("\", CO2 foot print:\"");
    Serial.print(currentFootprint);
    Serial.println("\",");
    updateOLED(currentMaterial, currentFootprint, targetAngle);
    lastPrintTime = millis();
  }

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
    binActive = false;
    currentSessionId = "";

    String resetPath = "/bins/" + String(BIN_ID);
    Firebase.RTDB.setJSON(&fbdo, resetPath.c_str(), "{\"status\":\"idle\"}");

    delay(1500);
  }
}