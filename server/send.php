<?php
// Lead receiver for the Alex Media site on Beget: the forms POST JSON here (same origin),
// the script sends the request as a letter to the agency's inbox through the hosting's own mail.
// Nothing leaves Russia: the site, this script and the mail server are all at Beget.
// Written for any PHP from 5.4 up: the hosting's default version is old.
//
// The build puts this file at the site root (npm run beget); the site calls /send.php.
// Answers: 204 - sent, 400 - bad body, 403 - foreign origin, 405 - not POST,
// 422 - no contact, 429 - too many from one address, 502 - the mail server refused.

$LEAD_TO = 'alex13girin@yandex.ru';
$LEAD_FROM = 'site@alexmediaagency.ru';
$ALLOWED_HOSTS = array('alexmediaagency.ru', 'www.alexmediaagency.ru');
$LIMIT = 2000;      // characters per field
$PER_WINDOW = 20;   // requests from one IP...
$WINDOW = 600;      // ...per 10 minutes

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function finish($status, $text = '') {
  http_response_code($status);
  if ($text !== '') {
    header('Content-Type: text/plain; charset=utf-8');
    echo $text;
  }
  exit;
}

function cut($text, $limit) {
  if (function_exists('mb_substr')) return mb_substr($text, 0, $limit, 'UTF-8');
  return preg_replace('/^(.{0,' . $limit . '}).*$/us', '$1', $text);
}

function field($body, $key, $limit) {
  $value = (is_array($body) && isset($body[$key]) && is_string($body[$key])) ? trim($body[$key]) : '';
  return cut($value, $limit);
}

function safe($text) {
  return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
}

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') finish(405, 'method');

// only the site's own pages may post (browsers always send Origin on a POST fetch)
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$host = parse_url($origin, PHP_URL_HOST);
if (!in_array($host, $ALLOWED_HOSTS, true)) finish(403, 'forbidden');

// a soft brake per IP: a file per address in the system temp folder
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
$mark = sys_get_temp_dir() . '/alexmedia-lead-' . md5($ip);
$now = time();
$hits = array();
if (is_file($mark)) {
  foreach (explode(',', (string) @file_get_contents($mark)) as $t) {
    if ((int) $t > $now - $WINDOW) $hits[] = (int) $t;
  }
}
if (count($hits) >= $PER_WINDOW) finish(429, 'too many');
$hits[] = $now;
@file_put_contents($mark, implode(',', $hits), LOCK_EX);

$body = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($body)) finish(400, 'bad json');

// a hidden field people never see: bots fill it - pretend all is well
if (field($body, 'website', $LIMIT) !== '') finish(204);

$details = isset($body['stage']) && $body['stage'] === 'details';
$contact = field($body, 'contact', $LIMIT);
if ($contact === '') finish(422, 'contact required');

$rows = array();
foreach (array('Контакт' => 'contact', 'Услуга' => 'service', 'Задача' => 'task', 'Ниша' => 'niche', 'Бюджет' => 'budget') as $label => $key) {
  $value = field($body, $key, $LIMIT);
  if ($value !== '') $rows[$label] = $value;
}

$title = $details ? 'Дополнение к заявке' : 'Новая заявка с сайта';
$page = field($body, 'page', 300);
$when = new DateTime('now', new DateTimeZone('Europe/Moscow'));

$html = '<h2 style="font-family:sans-serif">' . safe($title) . '</h2>';
foreach ($rows as $k => $v) {
  $html .= '<p style="font-family:sans-serif;font-size:15px"><b>' . safe($k) . ':</b> ' . nl2br(safe($v)) . '</p>';
}
$html .= '<p style="font-family:sans-serif;color:#888;font-size:13px">' . safe($page !== '' ? $page : 'alexmediaagency.ru') . ' · ' . $when->format('d.m.Y H:i') . ' МСК</p>';

// the subject carries the contact, so the inbox list already says who wrote
$subject = '=?UTF-8?B?' . base64_encode($title . ': ' . cut(str_replace(array("\r", "\n"), ' ', $contact), 80)) . '?=';
$fromName = '=?UTF-8?B?' . base64_encode('Сайт Alex Media') . '?=';
$headers = implode("\r\n", array(
  'MIME-Version: 1.0',
  'Content-Type: text/html; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  'From: ' . $fromName . ' <' . $LEAD_FROM . '>',
  'X-Mailer: alexmediaagency.ru',
));

$sent = mail($LEAD_TO, $subject, chunk_split(base64_encode($html)), $headers, '-f' . $LEAD_FROM);
if (!$sent) {
  error_log('alexmedia lead: mail() refused');
  finish(502, 'not delivered');
}
finish(204);
