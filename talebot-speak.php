<?php
require_once __DIR__ . '/_talebot-config.php';

setCorsHeaders();

$input     = json_decode(file_get_contents('php://input'), true) ?? [];
$text      = $input['text'] ?? '';
$character = $input['character'] ?? 'mogens';

$config       = loadConfig($character);
$elevenlabsKey = getApiKey('ELEVENLABS_API_KEY');

$charConfig   = $config['characters'][$character] ?? $config['characters']['mogens'];
$voiceId      = $charConfig['voice_id'];
$voiceSettings = $charConfig['voice_settings']['base'] ?? [
    'stability'        => 0.7,
    'similarity_boost' => 0.8,
    'use_speaker_boost' => true,
];

$apiConfig = $config['api']['elevenlabs'];

// Hent hele lydfilen som buffer – ingen streaming
$ch = curl_init("https://api.elevenlabs.io/v1/text-to-speech/{$voiceId}");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode([
        'text'           => $text,
        'model_id'       => $apiConfig['model'],
        'voice_settings' => $voiceSettings,
    ]),
    CURLOPT_HTTPHEADER     => [
        'xi-api-key: ' . $elevenlabsKey,
        'Accept: audio/mpeg',
        'Content-Type: application/json',
    ],
    CURLOPT_TIMEOUT        => (int) ceil(($apiConfig['timeout'] ?? 20000) / 1000),
]);

$audioData = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError || $httpCode !== 200 || !$audioData) {
    http_response_code(408);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Timeout eller fejl ved lydgenerering']);
    exit;
}

header('Content-Type: audio/mpeg');
header('Content-Length: ' . strlen($audioData));
echo $audioData;
