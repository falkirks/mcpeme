'use strict';

// Configuring the Records module
angular.module('records').run(['Menus',
  function (Menus) {
    // Add the records dropdown item

    // Add the dropdown list item
    Menus.addMenuItem('topbar', {
      title: 'Registry Listing',
      state: 'records.list'
    });

    // Add the dropdown create item
    Menus.addMenuItem('topbar', {
      title: 'Create Record',
      state: 'records.create',
      roles: ['user']
    });

    Menus.addMenuItem('topbar', {
      title: 'My records',
      state: 'records.mine',
      roles: ['user']
    });
  }
]);
