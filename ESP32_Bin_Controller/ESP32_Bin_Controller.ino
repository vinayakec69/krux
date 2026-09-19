#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Provide the token generation process info.
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

/* 1. Define your WiFi Credentials */
#define WIFI_SSID "krish"
#define WIFI_PASSWORD "okkrishfine"

/* 2. Define your Firebase Credentials */
#define API_KEY "AIzaSyDUs4meTrtJKgNLy-YvRiufFX5NjymB-SM"
#define DATABASE_URL "https://krux-ee1df-default-rtdb.firebaseio.com"

/* 3. Define the KRUX Bin ID */
// This matches the exact ID hardcoded in the prototype Scanner app
#define BIN_ID "KRUX_BIN_001"

/* 4. Hardware Pins */
#define IR_SENSOR_PIN 14 // GPIO14 connected to IR sensor OUT
#define SERVO_PIN 15     // (Optional) GPIO15 connected to Servo motor
#define LED_PIN 2        // Built-in LED

// Firebase Data object
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool binActive = false;
String currentUser = "";
unsigned long activeSince = 0;

void setup() {
  Serial.begin(115200);
  pinMode(IR_SENSOR_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());

  /* Assign the api key (required) */
  config.api_key = API_KEY;
  /* Assign the RTDB URL (required) */
  config.database_url = DATABASE_URL;

  // Sign up for anonymous access or use email/password if required by rules
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase Auth Successful");
  } else {
    Serial.printf("Firebase Auth Error: %s\n", config.signer.signupError.message.c_str());
  }

  /* Assign the callback function for the long running token generation task */
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (Firebase.ready()) {
    // 1. Check if the Bin is currently "active" (a user has scanned the QR code)
    String path = "/bins/" + String(BIN_ID);
    
    if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
      // Very basic parsing for prototype
      String json = fbdo.to<String>();
      
      // If status is "active", someone is scanning
      if (json.indexOf("\"status\":\"active\"") > 0) {
        digitalWrite(LED_PIN, HIGH); // Turn on LED to indicate bin is ready
        
        // Wait for IR sensor to trigger (LOW means object detected)
        if (digitalRead(IR_SENSOR_PIN) == LOW) {
          Serial.println("Item dropped into the bin!");
          
          // In a real scenario, you'd trigger the servo motor here
          // ...
          
          // Update Firebase to let the app know the physical drop happened
          // The app listens to this and rewards the user
          Firebase.RTDB.setString(&fbdo, (path + "/status").c_str(), "completed");
          
          Serial.println("Transaction marked as completed in Firebase!");
          digitalWrite(LED_PIN, LOW);
          delay(5000); // Prevent double-triggering
        }
      } else {
        digitalWrite(LED_PIN, LOW);
      }
    }
  }
  delay(500);
}
