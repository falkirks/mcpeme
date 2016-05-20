'use strict';

// Records controller
angular.module('records').controller('RecordsController', ['$scope', '$filter', '$stateParams', '$location', 'Authentication', 'Records',
  function ($scope, $filter, $stateParams, $location, Authentication, Records) {
    $scope.authentication = Authentication;

    // Create new Record
    $scope.create = function (isValid) {
      $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'recordForm');

        return false;
      }

      // Create new Record object
      var record = new Records({
        name: this.name,
        content: this.content,
        recordType: this.recordType
      });

      // Redirect after save
      record.$save(function (response) {
        $location.path('records/' + response._id);

        // Clear form fields
        $scope.title = '';
        $scope.content = '';
      }, function (errorResponse) {
        $scope.error = errorResponse.data.message;
      });
    };

    // Remove existing Record
    $scope.remove = function (record) {
      if (record) {
        record.$remove();

        for (var i in $scope.records) {
          if ($scope.records[i] === record) {
            $scope.records.splice(i, 1);
          }
        }
      } else {
        $scope.record.$remove(function () {
          $location.path('records');
        });
      }
    };

    // Update existing Record
    $scope.update = function (isValid) {
      $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'recordForm');

        return false;
      }

      var record = $scope.record;

      record.$update(function () {
        $location.path('records/' + record._id);
      }, function (errorResponse) {
        $scope.error = errorResponse.data.message;
      });
    };

    $scope.mine = function () {
      Records.mine(function (data) {
        $scope.records = data;
        $scope.buildPager();
      });
    };

    // Find a list of Records
    $scope.find = function () {
      Records.query(function (data) {
        $scope.records = data;
        $scope.buildPager();
      });
    };
    $scope.buildPager = function () {
      $scope.pagedItems = [];
      $scope.itemsPerPage = 15;
      $scope.currentPage = 1;
      $scope.figureOutItemsToDisplay();
    };

    $scope.figureOutItemsToDisplay = function () {
      $scope.filteredItems = $filter('filter')($scope.records, {
        $: $scope.search
      });
      $scope.filterLength = $scope.filteredItems.length;
      var begin = (($scope.currentPage - 1) * $scope.itemsPerPage);
      var end = begin + $scope.itemsPerPage;
      $scope.pagedItems = $scope.filteredItems.slice(begin, end);
    };

    $scope.pageChanged = function () {
      $scope.figureOutItemsToDisplay();
    };

    // Find existing Record
    $scope.findOne = function () {
      $scope.record = Records.get({
        recordId: $stateParams.recordId
      });
    };
  }
]);
