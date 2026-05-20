<?php
require_once __DIR__ . '/_talebot-config.php';

setCorsHeaders();
header('Content-Type: application/json; charset=utf-8');

$input               = json_decode(file_get_contents('php://input'), true) ?? [];
$userMessage         = $input['userMessage'] ?? '';
$mogensReply         = $input['mogensReply'] ?? '';
$conversationContext = $input['conversationContext'] ?? [];
$character           = preg_replace('/[^a-z_]/', '', strtolower($input['character'] ?? 'mogens'));

$config    = loadConfig($character);
$openaiKey = getApiKey('OPENAI_API_KEY');
$charName  = $config['characters'][$character]['name'] ?? ucfirst($character);

$messages = [
    ['role' => 'system', 'content' => buildCombinedSystemPrompt($config, $character)],
    ['role' => 'system', 'content' => "EVALUATION-MODE: Du skal KUN levere evaluering i det angivne format. Du må IKKE svare som {$charName} eller fortsætte dialogen."],
];

foreach ($conversationContext as $msg) {
    $messages[] = [
        'role'    => $msg['sender'] === 'Dig' ? 'user' : 'assistant',
        'content' => $msg['text'],
    ];
}

$messages[] = [
    'role'    => 'user',
    'content' => "Evaluér denne ytring fra sundhedsprofessionellen: \"{$userMessage}\"\n\n"
               . "{$charName}s forrige svar: \"{$mogensReply}\"\n\n"
               . "Vurder om sundhedsprofessionellens ytring er effektiv til at bygge videre på {$charName}s svar og følger kommunikationsprincipperne.",
];

$apiConfig = $config['api']['evaluation'];
$result    = curlPost(
    'https://api.openai.com/v1/chat/completions',
    [
        'model'       => $apiConfig['model'],
        'messages'    => $messages,
        'max_tokens'  => $apiConfig['max_tokens'],
        'temperature' => $apiConfig['temperature'],
    ],
    ['Authorization: Bearer ' . $openaiKey, 'Content-Type: application/json'],
    (int) ceil(($apiConfig['timeout'] ?? 10000) / 1000)
);

$fallback = $config['evaluation']['fallback_evaluation'] ?? 'Kunne ikke evaluere på nuværende tidspunkt.';

if ($result['error'] || $result['httpCode'] !== 200) {
    echo json_encode(['evaluation' => $fallback]);
    exit;
}

$data       = json_decode($result['body'], true);
$evaluation = $data['choices'][0]['message']['content'] ?? $fallback;

echo json_encode(['evaluation' => $evaluation]);
