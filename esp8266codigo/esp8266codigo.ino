#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

const char* ssid     = "brisa-4820196";
const char* password = "Z46pUwVZ";
const char* host     = "192.168.0.126";

#define LED        LED_BUILTIN
#define BTN_PLAY   13   // D1
#define BTN_NEXT   4   // D2
#define BTN_PREV   14  // D5

WiFiClient client;

int  ultimoVolume  = -1;
unsigned long ultimoEnvio   = 0;
unsigned long ultimaLeitura = 0;
unsigned long ledTimer      = 0;
bool ledState               = false;
int  piscasRestantes        = 0;
int  somaLeituras           = 0;
int  contLeituras           = 0;
const int N_AMOSTRAS        = 8;

// Debounce
unsigned long ultimoPlayPress = 0;
unsigned long ultimoNextPress = 0;
unsigned long ultimoPrevPress = 0;
const unsigned long DEBOUNCE  = 300; // ms

void piscaRapido(int vezes) {
  for (int i = 0; i < vezes; i++) {
    digitalWrite(LED, LOW);  delay(80);
    digitalWrite(LED, HIGH); delay(80);
  }
}

void agendarPiscada(int vezes) {
  piscasRestantes = vezes * 2;
  ledTimer = millis();
  ledState = false;
}

void atualizarLED() {
  if (piscasRestantes <= 0) return;
  if (millis() - ledTimer < 80) return;
  ledState = !ledState;
  digitalWrite(LED, ledState ? LOW : HIGH);
  ledTimer = millis();
  piscasRestantes--;
  if (piscasRestantes == 0)
    digitalWrite(LED, LOW);
}

void reconectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.println("Reconectando...");
  WiFi.disconnect();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED, LOW);  delay(200);
    digitalWrite(LED, HIGH); delay(200);
  }
  Serial.println(WiFi.localIP());
  piscaRapido(3);
  digitalWrite(LED, LOW);
}

void enviarComando(String rota) {
  HTTPClient http;
  String url = String("http://") + host + ":5000/" + rota;
  http.setTimeout(1000);
  http.begin(client, url);
  int httpCode = http.GET();
  http.end();

  if (httpCode == 200) {
    agendarPiscada(1);
    Serial.println(rota + " OK");
  } else {
    agendarPiscada(3);
    Serial.println(rota + " erro: " + String(httpCode));
  }
}

void verificarBotoes() {
  unsigned long agora = millis();

  // Play/Pause
  if (digitalRead(BTN_PLAY) == LOW && agora - ultimoPlayPress > DEBOUNCE) {
    ultimoPlayPress = agora;
    enviarComando("play");
  }

  // Próxima
  if (digitalRead(BTN_NEXT) == LOW && agora - ultimoNextPress > DEBOUNCE) {
    ultimoNextPress = agora;
    enviarComando("next");
  }

  // Anterior
  if (digitalRead(BTN_PREV) == LOW && agora - ultimoPrevPress > DEBOUNCE) {
    ultimoPrevPress = agora;
    enviarComando("prev");
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  digitalWrite(LED, HIGH);

  pinMode(BTN_PLAY, INPUT_PULLUP);
  pinMode(BTN_NEXT, INPUT_PULLUP);
  pinMode(BTN_PREV, INPUT_PULLUP);

  reconectarWiFi();
}

void loop() {
  reconectarWiFi();
  atualizarLED();
  verificarBotoes();

  unsigned long agora = millis();

  if (agora - ultimaLeitura >= 10) {
    ultimaLeitura = agora;
    somaLeituras += analogRead(A0);
    contLeituras++;
  }

  if (agora - ultimoEnvio >= 80 && contLeituras >= N_AMOSTRAS) {
    int media = somaLeituras / contLeituras;
    somaLeituras = 0;
    contLeituras = 0;

    int volume = map(media, 0, 1023, 0, 100);

    if (abs(volume - ultimoVolume) > 2) {
      ultimoVolume = volume;
      ultimoEnvio  = agora;
      enviarComando("volume?v=" + String(volume));
    }
  }
}