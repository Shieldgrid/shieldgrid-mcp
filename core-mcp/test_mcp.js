import { spawn } from 'child_process';

const server = spawn('node', ['dist/index.js'], {
  env: { ...process.env, SHIELDGRID_API_TOKEN: 'sg_mcp_test_token' }
});

server.stdout.on('data', (data) => {
  console.log(`STDOUT: ${data}`);
  process.exit(0);
});

server.stderr.on('data', (data) => {
  console.error(`STDERR: ${data}`);
});

const toolName = process.argv[2] || "list_cases";
const toolArgs = process.argv[3] ? JSON.parse(process.argv[3]) : {};

const req = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: toolName,
    arguments: toolArgs
  }
};

server.stdin.write(JSON.stringify(req) + '\n');
