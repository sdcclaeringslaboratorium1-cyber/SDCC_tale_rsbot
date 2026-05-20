<?php
require_once __DIR__ . '/_talebot-config.php';

setCorsHeaders();
header('Content-Type: application/json; charset=utf-8');

$input       = json_decode(file_get_contents('php://input'), true) ?? [];
$userMessage = $input['message'] ?? '';
$dialog      = $input['dialog'] ?? [];
$character   = preg_replace('/[^a-z_]/', '', strtolower($input['character'] ?? 'mogens'));

$config    = loadConfig($character);
$openaiKey = getApiKey('OPENAI_API_KEY');
$charName  = $config['characters'][$character]['name'] ?? ucfirst($character);

$messages = [
    ['role' => 'system', 'content' => buildCombinedSystemPrompt($config, $character)],
    ['role' => 'system', 'content' => "CHAT-MODE: Du svarer KUN som {$charName} i naturlig dialog. Hold karakter, og INGEN evaluering, INGEN [Score]/[Status]/[Attitude], INGEN meta-instruktioner. Du er patienten/pårørende."],
];

foreach ($dialog as $msg) {
    $messages[] = [
        'role'    => $msg['sender'] === 'Dig' ? 'user' : 'assistant',
        'content' => $msg['text'],
    ];
}
$messages[] = ['role' => 'user', 'content' => $userMessage];

$apiConfig = $config['api']['openai'];
$result    = curlPost(
    'https://api.openai.com/v1/chat/completions',
    [
        'model'       => $apiConfig['model'],
        'messages'    => $messages,
        'max_tokens'  => $apiConfig['max_tokens'],
        'temperature' => $apiConfig['temperature'],
    ],
    ['Authorization: Bearer ' . $openaiKey, 'Content-Type: application/json'],
    (int) ceil(($apiConfig['timeout'] ?? 15000) / 1000)
);

if ($result['error'] || $result['httpCode'] !== 200) {
    echo json_encode(['reply' => 'Ææh... jeg kan ikke rigtig... øh... hvad var det nu du spurgte om? [Status: 2]']);
    exit;
}

$data  = json_decode($result['body'], true);
$reply = $data['choices'][0]['message']['content']
    ?? 'Ææh... jeg kan ikke rigtig... øh... hvad var det nu du spurgte om? [Status: 2]';

echo json_encode(['reply' => $reply]);
