#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <ESP32Servo.h>

/* --- FIREBASE & WIFI CREDENTIALS --- */
#define WIFI_SSID "krish"
#define WIFI_PASSWORD "okkrishfine"
#define API_KEY "AIzaSyDUs4meTrtJKgNLy-YvRiufFX5NjymB-SM"
#define DATABASE_URL "https://krux-ee1df-default-rtdb.firebaseio.com"
#define BIN_ID "KRUX_BIN_001"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

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

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase Auth OK");
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

void notifyAppDropCompleted(int coins) {
  if (Firebase.ready()) {
    String path = "/drop_events/" + String(BIN_ID);
    FirebaseJson json;
    json.set("status", "confirmed");
    json.set("krux_earned", coins);

    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
      Serial.println("Firebase: App notified!");
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

      FirebaseJson response;
      response.set("status", "connected");
      response.set("session_id", currentSessionId);
      response.set("timestamp", millis());
      
      if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &response)) {
        Serial.println("[Handshake] Connected: " + currentSessionId);
        binActive = true;
      } else {
        Serial.println("[Handshake] Write failed: " + fbdo.errorReason());
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
  int targetAngle = ANGLE_HOME;
  int kruxCoins = 0;

  if (metalDetected) {
    currentMaterial = "METAL";
    targetAngle = ANGLE_METAL;
    kruxCoins = 5;
  }
  else if (sensorValue <= THRESH_NO_PAPER) {
    currentMaterial = "no paper";
    targetAngle = ANGLE_HOME;
    kruxCoins = 0;
  }
  else if (sensorValue > THRESH_NO_PAPER && sensorValue <= THRESH_HDPE_MAX) {
    currentMaterial = "HDPE";
    targetAngle = ANGLE_HDPE;
    kruxCoins = 12;
  }
  else if (sensorValue > THRESH_HDPE_MAX && sensorValue <= THRESH_PP_MAX) {
    currentMaterial = "PP";
    targetAngle = ANGLE_PP;
    kruxCoins = 11;
  }
  else {
    currentMaterial = "PET";
    targetAngle = ANGLE_PET;
    kruxCoins = 15;
  }

  if (millis() - lastPrintTime > 400) {
    Serial.print("ADC: "); Serial.print(sensorValue);
    Serial.print(" Type: "); Serial.print(currentMaterial);
    Serial.print(" Angle: "); Serial.print(targetAngle);
    Serial.print(" Metal: "); Serial.println(metalDetected ? "yes" : "no");
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
    FirebaseJson resetJson;
    resetJson.set("status", "idle");
    Firebase.RTDB.setJSON(&fbdo, resetPath.c_str(), &resetJson);

    delay(1500);
  }
}