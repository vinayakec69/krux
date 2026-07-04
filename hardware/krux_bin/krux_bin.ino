/*
  ╔════════════════════════════════════════════════════════════════════════╗
  ║          SMARTSEG 3-TYPE PLASTIC SORTER - ABSOLUTE POSITIONING       ║
  ║     ESP32 Laser-Based Plastic Detection with Fixed Angles            ║
  ║               + KRUX IoT FIREBASE INTEGRATION                        ║
  ╚════════════════════════════════════════════════════════════════════════╝
*/

#include <ESP32Servo.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ═══════════════════════════════════════════════════════════════════════
// WIFI & FIREBASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════
const char* ssid = "YOUR_WIFI_SSID";           // <-- CHANGE THIS
const char* password = "YOUR_WIFI_PASSWORD";   // <-- CHANGE THIS
const char* binId = "KRUX_BIN_001";            // The ID of this specific bin
const char* apiKey = "KrUx2025SmartSeg-BinKey-X9mZ"; 
// Replace the URL below with the URL of your deployed Firebase Cloud Function
const char* cloudFunctionURL = "https://us-central1-krux-base.cloudfunctions.net/binDropEvent"; 

// ═══════════════════════════════════════════════════════════════════════
// PIN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

#define PHOTO_PIN      34    // Photodiode signal input (ADC1_CH6)
#define SERVO_PIN      18    // Servo PWM control
#define BUTTON_PIN      0    // BOOT button for calibration
#define LED_PIN         2    // Built-in LED for status indication

// ═══════════════════════════════════════════════════════════════════════
// SERVO ANGLE DEFINITIONS - ABSOLUTE POSITIONING FROM 0°
// ═══════════════════════════════════════════════════════════════════════

#define SERVO_HOME      0      // Home position - no plastic detected
#define SERVO_TYPE_1    90     // First plastic: +90° from home
#define SERVO_TYPE_2    270    // Second plastic: -90° from home (or 270°)
#define SERVO_TYPE_3    180    // Third plastic: 180° from home

// ═══════════════════════════════════════════════════════════════════════
// ADC & SIGNAL PROCESSING SETTINGS
// ═══════════════════════════════════════════════════════════════════════

#define NOISE_FLOOR 12           // Dark current baseline
#define AMPLIFIER_GAIN 10.0      // Virtual amplification factor
#define ADC_SAMPLES 20           // Number of samples to average
#define SAMPLE_DELAY_MS 10       // Delay between samples (milliseconds)

// ═══════════════════════════════════════════════════════════════════════
// CALIBRATION THRESHOLDS - ADJUST AFTER CALIBRATION
// ═══════════════════════════════════════════════════════════════════════

#define TYPE1_THRESHOLD_MIN 500   // Type 1 (PET) ≥ 500
#define TYPE2_THRESHOLD_MIN 250   // Type 2 (LDPE) 250-499
#define TYPE2_THRESHOLD_MAX 499
#define TYPE3_THRESHOLD_MAX 249   // Type 3 (HDPE) ≤ 249

// ═══════════════════════════════════════════════════════════════════════
// GLOBAL VARIABLES
// ═══════════════════════════════════════════════════════════════════════

Servo containerServo;

// Calibration data
int dark_baseline = 0;
int clear_baseline = 0;
int type1_calibrated = 0;
int type2_calibrated = 0;
int type3_calibrated = 0;
bool calibrated = false;

// Servo state - tracking absolute position
int current_servo_angle = SERVO_HOME;
int last_servo_angle = SERVO_HOME;

// Statistics
int type1_count = 0;
int type2_count = 0;
int type3_count = 0;
int no_plastic_count = 0;
int total_detections = 0;

// Timing for servo movements
unsigned long last_detection_time = 0;
const long DETECTION_INTERVAL = 1500;  // Minimum 1.5 seconds between moves

// Timing for 1-second ADC output
unsigned long last_output_time = 0;
const long OUTPUT_INTERVAL = 1000;  // Print every 1 second

// ═══════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  // Pin configuration
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(PHOTO_PIN, INPUT);
  
  // ADC configuration
  analogSetAttenuation(ADC_11db);
  analogSetWidth(12);
  
  // Servo initialization - START AT HOME (0°)
  containerServo.attach(SERVO_PIN, 1000, 2000);
  containerServo.write(SERVO_HOME);
  current_servo_angle = SERVO_HOME;
  last_servo_angle = SERVO_HOME;
  
  // Print welcome banner
  printWelcomeBanner();
  
  // LED startup sequence
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  
  // --- CONNECT TO WIFI ---
  Serial.print("\nConnecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  // -------------------------

  Serial.println("\n✅ System ready! Monitoring ADC values...\n");
  Serial.println("Servo starting position: 0° (HOME)\n");
  Serial.println("═════════════════════════════════════════════════════════════\n");
  
  last_output_time = millis();
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════

void loop() {
  // Check for calibration button
  if (digitalRead(BUTTON_PIN) == LOW) {
    delay(500);
    performCalibration();
    return;
  }
  
  // Read photodiode
  int raw_adc = readPhotodetectorAdvanced();
  int amplified_adc = virtualAmplifier(raw_adc);
  
  // Classify plastic type
  int plastic_type = classifyPlastic(amplified_adc);
  
  // Get target servo angle based on plastic type
  int target_angle = getServoAngle(plastic_type);
  
  // Move servo if angle changed AND enough time has passed
  if (target_angle != last_servo_angle) {
    if (millis() - last_detection_time >= DETECTION_INTERVAL) {
      // Move servo to absolute position
      containerServo.write(target_angle);
      last_servo_angle = target_angle;
      current_servo_angle = target_angle;
      
      // Print detection event with angle change
      printDetectionEvent(plastic_type, target_angle, raw_adc, amplified_adc);
      
      // Update statistics
      updateStatistics(plastic_type);
      
      // LED blink on servo movement
      digitalWrite(LED_PIN, HIGH);
      delay(300);
      digitalWrite(LED_PIN, LOW);
      
      // --- TRIGGER KRUX APP DROP CONFIRMATION ---
      // We only notify the app if it's an actual plastic drop (not returning home)
      if (plastic_type != 0 && WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(cloudFunctionURL);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("x-api-key", apiKey);

        // Send bin ID. Cloud function will automatically lookup active session
        String jsonPayload = "{\"bin_id\": \"" + String(binId) + "\"}";
        
        Serial.println("\n[IoT] Sending Drop Event to KRUX App...");
        int httpResponseCode = http.POST(jsonPayload);
        
        if (httpResponseCode > 0) {
          Serial.print("[IoT] App Response Code: ");
          Serial.println(httpResponseCode);
        } else {
          Serial.print("[IoT] Error sending request: ");
          Serial.println(http.errorToString(httpResponseCode).c_str());
        }
        http.end();
      }
      // ------------------------------------------

      last_detection_time = millis();
    }
  }
  
  // ★★★ PRINT ADC VALUES EVERY 1 SECOND ★★★
  if (millis() - last_output_time >= OUTPUT_INTERVAL) {
    printRealtimeMonitoring(raw_adc, amplified_adc, plastic_type, current_servo_angle);
    last_output_time = millis();
  }
  
  delay(100);
}

// ═══════════════════════════════════════════════════════════════════════
// FUNCTION: Read photodiode with averaging
// ═══════════════════════════════════════════════════════════════════════
int readPhotodetectorAdvanced() {
  long sum = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) {
    sum += analogRead(PHOTO_PIN);
    delay(SAMPLE_DELAY_MS);
  }
  return sum / ADC_SAMPLES;
}

// ═══════════════════════════════════════════════════════════════════════
// FUNCTION: Virtual amplifier
// ═══════════════════════════════════════════════════════════════════════
int virtualAmplifier(int raw_adc) {
  int clean_signal = raw_adc - NOISE_FLOOR;
  if (clean_signal < 0) clean_signal = 0;
  int amplified = (int)(clean_signal * AMPLIFIER_GAIN);
  if (amplified > 4095) amplified = 4095;
  return amplified;
}

// ═══════════════════════════════════════════════════════════════════════
// FUNCTION: Classify plastic type
// ═══════════════════════════════════════════════════════════════════════
int classifyPlastic(int amplified_adc) {
  if (amplified_adc >= TYPE1_THRESHOLD_MIN) {
    return 1;  // Type 1 (PET)
  } 
  else if (amplified_adc >= TYPE2_THRESHOLD_MIN && amplified_adc <= TYPE2_THRESHOLD_MAX) {
    return 2;  // Type 2 (LDPE)
  } 
  else if (amplified_adc <= TYPE3_THRESHOLD_MAX) {
    return 3;  // Type 3 (HDPE)
  } 
  else {
    return 0;  // No plastic
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNCTION: Get ABSOLUTE servo angle
// ═══════════════════════════════════════════════════════════════════════
int getServoAngle(int plastic_type) {
  switch(plastic_type) {
    case 1: return SERVO_TYPE_1;
    case 2: return SERVO_TYPE_2;
    case 3: return SERVO_TYPE_3;
    default: return SERVO_HOME;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FUNCTION: Print detection event
// ═══════════════════════════════════════════════════════════════════════
void printDetectionEvent(int plastic_type, int servo_angle, int raw_adc, int amplified_adc) {
  Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("🔍 PLASTIC DETECTED - SERVO MOVING:");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.print("🔵 Plastic Type: ");
  switch(plastic_type) {
    case 0: Serial.println("NONE (Servo returning to HOME)"); break;
    case 1: Serial.println("TYPE 1 - PET (Clear bottles)"); break;
    case 2: Serial.println("TYPE 2 - LDPE (Flexible bags)"); break;
    case 3: Serial.println("TYPE 3 - HDPE (Opaque containers)"); break;
  }
  Serial.print("🔄 Servo Moving To: ");
  Serial.print(servo_angle);
  Serial.println("°");
}

// ═══════════════════════════════════════════════════════════════════════
// FUNCTION: Print real-time monitoring
// ═══════════════════════════════════════════════════════════════════════
void printRealtimeMonitoring(int raw_adc, int amplified_adc, int plastic_type, int servo_angle) {
  unsigned long uptime_ms = millis();
  unsigned long uptime_sec = uptime_ms / 1000;
  
  Serial.print("["); Serial.print(uptime_sec); Serial.print("s] ");
  Serial.print("RAW: "); Serial.print(raw_adc); Serial.print("  ");
  Serial.print("AMP: "); Serial.print(amplified_adc); Serial.print("  ");
  Serial.print("TYPE: "); Serial.print(plastic_type); Serial.print("  ");
  Serial.print("ANGLE: "); Serial.print(servo_angle); Serial.println("°");
}

// ═══════════════════════════════════════════════════════════════════════
// FUNCTION: Update and Print Statistics
// ═══════════════════════════════════════════════════════════════════════
void updateStatistics(int plastic_type) {
  total_detections++;
  switch(plastic_type) {
    case 1: type1_count++; break;
    case 2: type2_count++; break;
    case 3: type3_count++; break;
    case 0: no_plastic_count++; break;
  }
}

void printStatistics() { }

// ═══════════════════════════════════════════════════════════════════════
// FUNCTION: Calibration mode
// ═══════════════════════════════════════════════════════════════════════
void performCalibration() {
  Serial.println("\n⚙️ CALIBRATION MODE ACTIVATED (skipped in shortened view)");
  calibrated = true;
  delay(1000);
}

void waitForButtonPress() {
  while (digitalRead(BUTTON_PIN) == HIGH) {
    delay(50);
  }
  delay(500);
}

// ═══════════════════════════════════════════════════════════════════════
// FUNCTION: Print welcome banner
// ═══════════════════════════════════════════════════════════════════════
void printWelcomeBanner() {
  Serial.println("\n╔═══════════════════════════════════════════════════════╗");
  Serial.println("║   SMARTSEG PLASTIC SORTER + KRUX IoT INTEGRATION    ║");
  Serial.println("╚═══════════════════════════════════════════════════════╝");
}
