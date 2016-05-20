'use strict';

describe('Records E2E Tests:', function () {
  describe('Test records page', function () {
    it('Should report missing credentials', function () {
      browser.get('http://localhost:3001/records');
      expect(element.all(by.repeater('record in records')).count()).toEqual(0);
    });
  });
});
