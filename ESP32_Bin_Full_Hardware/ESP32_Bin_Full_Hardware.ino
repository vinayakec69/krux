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
const int PIN_PAN_SERVO_1 = 19; // 1st Base Servo (0 to 180 degrees)
const int PIN_PAN_SERVO_2 = 18; // 2nd Base Servo (181 to 359 degrees)
const int PIN_TILT_SERVO = 23; // Top Servo (Tilts the plate)
const int PIN_IR_SENSOR = 27;
const int PIN_LASER = 5;

Servo panServo1;
Servo panServo2;
Servo tiltServo;

// --- PAN & TILT ANGLES ---
const int TILT_FLAT = 90;
const int TILT_DROP = 150;

const int ANGLE_HOME = 90; // Neutral waiting position for Servo 1
const int ANGLE_HOME_2= 0; // Neutral waiting position for Servo 2

// Distributing the 4 chambers across the 360-degree virtual space
const int ANGLE_PET = 0; // Chamber 1: Uses Pan Servo 1
const int ANGLE_PP = 90; // Chamber 2: Uses Pan Servo 1
const int ANGLE_HDPE = 180; // Chamber 3: Uses Pan Servo 2 (Physically moves to 90)
const int ANGLE_METAL = 359; // Chamber 4: Uses Pan Servo 2 (Physically moves to 179)

// --- YOUR CUSTOM OPTICAL THRESHOLDS ---
const int THRESH_NO_PAPER = 0;
const int THRESH_HDPE_MAX = 600;
const int THRESH_PP_MAX = 1700;

unsigned long lastPrintTime = 0;

void setup() {
  Serial.begin(115200);

  pinMode(PIN_LASER, OUTPUT);
  pinMode(PIN_IR_SENSOR, INPUT);
  pinMode(PIN_INDUCTIVE, INPUT);

  // Initialize OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("OLED failed"));
  }
  display.setTextColor(WHITE);
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(10, 20);
  display.println("BOOTING...");
  display.display();

  // Connect to Wi-Fi
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

  /* Assign Firebase credentials */
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Sign up for anonymous access
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase Auth Successful");
  } else {
    Serial.printf("Firebase Auth Error: %s\n", config.signer.signupError.message.c_str());
  }

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Allocate hardware timers for 3 Servos
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  // Staggered startup: Attach, Move, and Detach ONE at a time
  panServo1.setPeriodHertz(50);
  panServo1.attach(PIN_PAN_SERVO_1, 500, 2400);
  panServo1.write(ANGLE_HOME);
  delay(500);
  panServo1.detach(); // Cut power to Pan 1

  panServo2.setPeriodHertz(50);
  panServo2.attach(PIN_PAN_SERVO_2, 500, 2400);
  panServo2.write(ANGLE_HOME_2);
  delay(500);
  panServo2.detach(); // Cut power to Pan 2

  tiltServo.setPeriodHertz(50);
  tiltServo.attach(PIN_TILT_SERVO, 500, 2400);
  tiltServo.write(TILT_FLAT);
  delay(500);
  tiltServo.detach(); // Cut power to Tilt

  analogSetAttenuation(ADC_11db);

  updateOLED("READY", "--", ANGLE_HOME);
  Serial.println("System Ready. Continuous Monitoring Active...");
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

  if(material == "no paper") {
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

// Function to send confirmation to App via Firebase
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

void loop() {
  int sensorValue = getSmoothedReading();
  int irState = digitalRead(PIN_IR_SENSOR);

  // NPN PNP sensor pulls to HIGH when metal is detected
  bool metalDetected = (digitalRead(PIN_INDUCTIVE) == HIGH);

  String currentMaterial = "no paper";
  String currentFootprint = "--";
  String isMetalString = "no";
  int targetAngle = ANGLE_HOME;
  int kruxCoins = 0;

  // CLASSIFICATION LOGIC
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

  // CONTINUOUS OUTPUT (Prints every 400 milliseconds)
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

  // --- STRICTLY SEQUENTIAL ACTUATION FOR POWER EFFICIENCY ---
  if (irState == LOW && currentMaterial!= "no paper") {

    // LOGIC ROUTER: Decide which Pan Servo to use
    if (targetAngle <= 180) {

      // STEP 1: Wake up, move, and sleep PAN SERVO 1
      panServo1.attach(PIN_PAN_SERVO_1, 500, 2400);
      panServo1.write(targetAngle);
      delay(1000);
      panServo1.detach(); // CUT POWER

      // STEP 2: Wake up, drop, reset, and sleep TILT SERVO
      tiltServo.attach(PIN_TILT_SERVO, 500, 2400);
      tiltServo.write(TILT_DROP);
      delay(1000);
      tiltServo.write(TILT_FLAT);
      delay(600);
      tiltServo.detach(); // CUT POWER

      // STEP 3: Wake up, return home, and sleep PAN SERVO 1
      panServo1.attach(PIN_PAN_SERVO_1, 500, 2400);
      panServo1.write(ANGLE_HOME);
      delay(800);
      panServo1.detach(); // CUT POWER

    } else {

      // STEP 1: Wake up, move, and sleep PAN SERVO 2
      int servo2MappedAngle = targetAngle - 180;

      panServo2.attach(PIN_PAN_SERVO_2, 500, 2400);
      panServo2.write(servo2MappedAngle);
      delay(1000);
      panServo2.detach(); // CUT POWER

      // STEP 2: Wake up, drop, reset, and sleep TILT SERVO
      tiltServo.attach(PIN_TILT_SERVO, 500, 2400);
      tiltServo.write(TILT_DROP);
      delay(1000);
      tiltServo.write(TILT_FLAT);
      delay(600);
      tiltServo.detach(); // CUT POWER

      // STEP 3: Wake up, return home, and sleep PAN SERVO 2
      panServo2.attach(PIN_PAN_SERVO_2, 500, 2400);
      panServo2.write(ANGLE_HOME_2);
      delay(800);
      panServo2.detach(); // CUT POWER
    }
    
    // TELL THE REACT APP THAT THE DROP HAPPENED!
    notifyAppDropCompleted(kruxCoins);

    delay(1500); // Prevent double-dropping by waiting for hand to clear IR sensor
  }
}
