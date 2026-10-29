export function getHealth(_request, response) {
  response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
