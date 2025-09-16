Goal: e-sign provider.
Steps:
1) POST /sign/send: send PDF base64 to DocuSign or Dropbox Sign, return envelope/request id.
2) POST /sign/webhook: verify signature, mark contract status complete/declined for client.
3) Events stream: GET /events?since=… returns latest completions for polling.
Tests: webhook signature verification logic.