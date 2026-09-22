const assert = require('node:assert/strict');
const { buildFilterJql } = require('../src/utils/search/filter-utils.js');

assert.equal(
  buildFilterJql('facture', { project: 'LVNET', status: 'En cours' }, [
    { id: 'project', jqlField: 'project' },
    { id: 'status', jqlField: 'status' }
  ]),
  'updated >= -30d AND (text ~ "facture*" OR summary ~ "facture*" OR description ~ "facture*") AND project = "LVNET" AND status = "En cours" ORDER BY updated DESC'
);

assert.equal(
  buildFilterJql('', { customfield_12345: 'Produit "A"' }, [
    { id: 'customfield_12345', jqlField: 'customfield_12345' }
  ]),
  'updated >= -30d AND customfield_12345 = "Produit \\"A\\"" ORDER BY updated DESC'
);

assert.equal(
  buildFilterJql('', {}, [{ id: 'project', jqlField: 'project' }]),
  'updated >= -30d ORDER BY updated DESC'
);

console.log('filter-utils: 3 tests passed');
