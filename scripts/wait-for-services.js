const { execSync } = require('child_process');

function wait() {
  console.log('Waiting for Postgres and Redis to become healthy...');
  const max = 60;
  for (let i = 0; i < max; i++) {
    try {
      const pg = execSync('docker inspect --format="{{.State.Health.Status}}" $(docker-compose -f docker-compose.test.yml ps -q postgres) 2>/dev/null').toString().trim();
      const rd = execSync('docker inspect --format="{{.State.Health.Status}}" $(docker-compose -f docker-compose.test.yml ps -q redis) 2>/dev/null').toString().trim();
      if (pg === 'healthy' && rd === 'healthy') {
        console.log('Services are healthy');
        process.exit(0);
      }
    } catch (e) {
      // ignore
    }
    execSync('sleep 1');
  }
  console.error('Timeout waiting for services');
  process.exit(1);
}

wait();
