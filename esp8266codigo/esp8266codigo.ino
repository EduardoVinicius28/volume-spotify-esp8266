#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

const char* ssid     = "brisa-4820196";
const char* password = "Z46pUwVZ";
const char* host     = "192.168.0.126"; // ← IP real do seu PC na rede Wi-Fi

WiFiClient client;
int ultimoVolume = -1;

void reconectarWiFi() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi desconectado, reconectando...");
        WiFi.disconnect();
        WiFi.begin(ssid, password);
        int tentativas = 0;
        while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
            delay(500);
            tentativas++;
        }
    }
}

void setup() {
    Serial.begin(115200);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
    }
    Serial.println("WiFi conectado!");
    Serial.println(WiFi.localIP());
}

void loop() {
    reconectarWiFi();

    int leitura = analogRead(A0);

    // 🔧 Suavização: média de 5 leituras para evitar ruído no potenciômetro
    for (int i = 0; i < 4; i++) {
        leitura += analogRead(A0);
        delay(5);
    }
    leitura /= 5;

    int volume = map(leitura, 0, 1023, 0, 100);

    if (abs(volume - ultimoVolume) > 2) {
        ultimoVolume = volume;

        HTTPClient http;
        String url = String("http://") + host + ":5000/volume?v=" + String(volume);

        http.begin(client, url);
        int httpCode = http.GET();

        if (httpCode == 200) {
            Serial.printf("Volume: %d%% ✓\n", volume);
        } else {
            Serial.printf("Erro HTTP: %d\n", httpCode);
        }

        http.end();
    }

    delay(100);
}