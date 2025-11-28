import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1, // Fail fast
    retryStrategy(times) {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 50, 2000);
    },
});

let loggedError = false;
redis.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
        if (!loggedError) {
            console.warn('Redis connection failed. Caching will default to in-memory fallback.');
            loggedError = true;
        }
    } else {
        console.warn('Redis error:', err.message);
    }
});

export default redis;
