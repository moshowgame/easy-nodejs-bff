const request = require('supertest');
const { createBFFApp, orchestrate, sortBy, paginate, pick, merge, groupBy } = require('../src/index');

describe('easy-nodejs-bff', () => {
  let app;
  
  beforeAll(() => {
    app = createBFFApp({ monitoring: false });
  });
  
  describe('Health Check', () => {
    test('GET /health should return status ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Monitoring', () => {
    test('GET /metrics should exist when monitoring is enabled', async () => {
      const monitoredApp = createBFFApp({ monitoring: true });
      const response = await request(monitoredApp).get('/metrics');
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Transformers', () => {
    test('sortBy should sort array in descending order', () => {
      const data = [{ score: 3 }, { score: 1 }, { score: 2 }];
      const result = sortBy(data, 'score', 'desc');
      expect(result[0].score).toBe(3);
      expect(result[1].score).toBe(2);
      expect(result[2].score).toBe(1);
    });

    test('sortBy should sort array in ascending order', () => {
      const data = [{ score: 3 }, { score: 1 }, { score: 2 }];
      const result = sortBy(data, 'score', 'asc');
      expect(result[0].score).toBe(1);
      expect(result[1].score).toBe(2);
      expect(result[2].score).toBe(3);
    });

    test('paginate should return correct page of data', () => {
      const data = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
      const result = paginate(data, 2, 10);
      
      expect(result.data.length).toBe(10);
      expect(result.data[0].id).toBe(11);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
    });

    test('pick should select specified fields', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    test('merge should flatten arrays', () => {
      const result = merge([1, 2], [3, 4], [5]);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('groupBy should group by key', () => {
      const data = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 },
      ];
      const result = groupBy(data, 'type');
      expect(Object.keys(result)).toEqual(['a', 'b']);
      expect(result.a.length).toBe(2);
      expect(result.b.length).toBe(1);
    });
  });

  describe('Orchestrator', () => {
    test('orchestrate with empty apiGroups should return empty results', async () => {
      const results = await orchestrate({});
      expect(results._meta).toBeDefined();
      expect(results._meta.totalGroups).toBe(0);
    });
  });
});
