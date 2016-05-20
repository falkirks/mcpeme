'use strict';

// Setting up route
angular.module('records').config(['$stateProvider',
  function ($stateProvider) {
    // Records state routing
    $stateProvider
      .state('records', {
        abstract: true,
        url: '/records',
        template: '<ui-view/>'
      })
      .state('records.list', {
        url: '',
        templateUrl: 'modules/records/client/views/list-records.client.view.html'
      })
      .state('records.mine', {
        url: '/mine',
        templateUrl: 'modules/records/client/views/my-records.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('records.create', {
        url: '/create',
        templateUrl: 'modules/records/client/views/create-record.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('records.view', {
        url: '/:recordId',
        templateUrl: 'modules/records/client/views/view-record.client.view.html'
      })
      .state('records.edit', {
        url: '/:recordId/edit',
        templateUrl: 'modules/records/client/views/edit-record.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      });
  }
]);
