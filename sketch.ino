#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ---------- UUIDs (match the Swift app) ----------
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789ABC"
#define CHARACTERISTIC_UUID "12345678-1234-1234-1234-123456789DEF"

// ---------- Pins ----------
#define STEP_PIN 25
#define DIR_PIN  26

// ---------- Tuning ----------
const int  STEPS_PER_NUDGE = 15;      // how far to move per command; bigger = bigger jumps
const int  PULSE_DELAY_US  = 5000;    // pulse speed; bigger = slower/smoother each nudge
const int8_t DEADZONE      = 15;      // if |offset| <= this, don't move (ball ~centered)

// ---------- Command from phone ----------
volatile int8_t latestOffset = 0;
volatile bool   newCommand   = false;

// ---------- BLE handler ----------
class CommandCallback : public BLECharacteristicCallbacks {
void onWrite(BLECharacteristic *pCharacteristic) {
    String value = pCharacteristic->getValue();
if (value.length() >= 1) {
      latestOffset = (int8_t)value[0];
      newCommand = true;
    }
  }
};

class ServerCallback : public BLEServerCallbacks {
void onConnect(BLEServer *s) { Serial.println("*** CONNECTED ***"); }
void onDisconnect(BLEServer *s) {
Serial.println("*** DISCONNECTED - re-advertising ***");
s->startAdvertising();
  }
};

// Move a small fixed amount in the given direction
void nudge(bool directionHigh) {
digitalWrite(DIR_PIN, directionHigh ? HIGH : LOW);
for (int i = 0; i < STEPS_PER_NUDGE; i++) {
digitalWrite(STEP_PIN, HIGH);
delayMicroseconds(PULSE_DELAY_US);
digitalWrite(STEP_PIN, LOW);
delayMicroseconds(PULSE_DELAY_US);
  }
}

void setup() {
Serial.begin(115200);
delay(500);
Serial.println("\n=== SoccerCam (simple nudge) ===");

pinMode(STEP_PIN, OUTPUT);
pinMode(DIR_PIN, OUTPUT);
digitalWrite(STEP_PIN, LOW);

  BLEDevice::init("SoccerCam");
  BLEServer *pServer = BLEDevice::createServer();
pServer->setCallbacks(new ServerCallback());
  BLEService *pService = pServer->createService(SERVICE_UUID);
  BLECharacteristic *pChar = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
pChar->setCallbacks(new CommandCallback());
pService->start();

  BLEAdvertising *pAdv = BLEDevice::getAdvertising();
pAdv->addServiceUUID(SERVICE_UUID);
pAdv->setScanResponse(true);
pAdv->start();

Serial.println("BLE ready. Advertising as 'SoccerCam'.");
}

void loop() {
if (newCommand) {
    newCommand = false;
int8_t offset = latestOffset;

if (offset > DEADZONE) {
nudge(false);              // ball on one side -> nudge one way
Serial.print("nudge RIGHT (offset="); Serial.print(offset); Serial.println(")");
    } else if (offset < -DEADZONE) {
nudge(true);             // ball on other side -> nudge other way
Serial.print("nudge LEFT (offset="); Serial.print(offset); Serial.println(")");
    } else {
      // within deadzone -> don't move
    }
  }
}