<?php
function getApiKey(string $name): string {
    $key = getenv($name);
    if (!$key && file_exists(__DIR__ . '/secrets.local.php')) {
        require_once __DIR__ . '/secrets.local.php';
        $key = getenv($name);
    }
    return $key ?: '';
}

function loadConfig(string $character = 'mogens'): array {
    $file = __DIR__ . "/config_{$character}.js";
    if (!file_exists($file)) {
        $file = __DIR__ . '/config_mogens.js';
    }

    $raw = file_get_contents($file);
    if ($raw === false) {
        http_response_code(503);
        header('Content-Type: application/json');
        echo json_encode(['error' => "Kunne ikke læse config-fil: config_{$character}.js"]);
        exit;
    }

    // Filen er JSONP-format: window.configXxxDataCallback({...});
    if (preg_match('/window\.\w+\((\{[\s\S]*\})\s*\)\s*;?\s*$/', $raw, $m)) {
        $config = json_decode($m[1], true);
    } else {
        $config = json_decode($raw, true);
    }

    if (!$config) {
        http_response_code(503);
        header('Content-Type: application/json');
        echo json_encode(['error' => "Kunne ikke parse config-fil: config_{$character}.js"]);
        exit;
    }

    return $config;
}

function normalizePrompt(mixed $value): string {
    return is_array($value) ? implode("\n", $value) : (string) $value;
}

function buildCombinedSystemPrompt(array $config, string $character = 'mogens'): string {
    $charConfig       = $config['characters'][$character] ?? $config['characters']['mogens'];
    $patientSection   = normalizePrompt($charConfig['system_prompt'] ?? '');
    $evaluationSection = normalizePrompt($config['evaluation']['system_prompt'] ?? '');

    return "[ROLLE: PATIENT – " . strtoupper($character) . "]\n"
        . $patientSection
        . "\n\n---\n"
        . "[ROLLE: EVALUERING – KUN TIL /api/evaluate. IGNORÉR DENNE SEKTION I CHAT-SVAR.]\n"
        . $evaluationSection;
}

function setCorsHeaders(): void {
    $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = ['videncenterfordiabetes.dk', 'stenovidencenter.dk'];

    $ok = str_starts_with($origin, 'http://localhost')
        || str_starts_with($origin, 'http://127.0.0.1');

    if (!$ok) {
        foreach ($allowed as $domain) {
            if ($origin === "https://$domain" || str_ends_with($origin, ".$domain")) {
                $ok = true;
                break;
            }
        }
    }

    if ($ok) header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Vary: Origin');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function curlPost(string $url, array $payload, array $headers, int $timeoutSeconds = 30): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => $timeoutSeconds,
    ]);
    $body     = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error    = curl_error($ch);
    curl_close($ch);

    return ['body' => $body, 'httpCode' => $httpCode, 'error' => $error];
}
