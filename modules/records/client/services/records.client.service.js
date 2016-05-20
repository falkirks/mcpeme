'use strict';

//Records service used for communicating with the records REST endpoints
angular.module('records').factory('Records', ['$resource',
  function ($resource) {
    return $resource('api/records/:recordId', {
      recordId: '@_id'
    }, {
      update: {
        method: 'PUT'
      },
      mine: {
        isArray: true,
        method: 'GET',
        url: 'api/records/mine'
      }
    });
  }
]);
