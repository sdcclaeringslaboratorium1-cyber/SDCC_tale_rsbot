<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$url = 'https://raw.githubusercontent.com/sdcclaeringslaboratorium1-cyber/SDCC_tale_rsbot/main/config.json';

echo "<h2>Debug: Forsøger at hente config fra GitHub</h2>";
echo "<p>URL: <a href='$url' target='_blank'>$url</a></p>";

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_FOLLOWLOCATION => true,
]);

$raw      = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error    = curl_error($ch);
curl_close($ch);

echo "<p><strong>HTTP Status:</strong> $httpCode</p>";
echo "<p><strong>cURL Error:</strong> " . ($error ?: "Ingen") . "</p>";
echo "<p><strong>Svar længde:</strong> " . strlen($raw ?? '') . " bytes</p>";

if ($error) {
    echo "<p style='color:red;'><strong>❌ cURL fejl:</strong> $error</p>";
} elseif ($httpCode !== 200) {
    echo "<p style='color:red;'><strong>❌ HTTP $httpCode</strong> (ventet 200)</p>";
    echo "<pre>" . htmlspecialchars(substr($raw, 0, 500)) . "</pre>";
} else {
    echo "<p style='color:green;'><strong>✅ Hentet OK!</strong></p>";
    echo "<pre>" . htmlspecialchars(substr($raw, 0, 500)) . "...</pre>";
}
?>
