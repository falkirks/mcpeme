'use strict';

(function () {
  // Records Controller Spec
  describe('Records Controller Tests', function () {
    // Initialize global variables
    var RecordsController,
      scope,
      $httpBackend,
      $stateParams,
      $location,
      Authentication,
      Records,
      mockRecord;

    // The $resource service augments the response object with methods for updating and deleting the resource.
    // If we were to use the standard toEqual matcher, our tests would fail because the test values would not match
    // the responses exactly. To solve the problem, we define a new toEqualData Jasmine matcher.
    // When the toEqualData matcher compares two objects, it takes only object properties into
    // account and ignores methods.
    beforeEach(function () {
      jasmine.addMatchers({
        toEqualData: function (util, customEqualityTesters) {
          return {
            compare: function (actual, expected) {
              return {
                pass: angular.equals(actual, expected)
              };
            }
          };
        }
      });
    });

    // Then we can start by loading the main application module
    beforeEach(module(ApplicationConfiguration.applicationModuleName));

    // The injector ignores leading and trailing underscores here (i.e. _$httpBackend_).
    // This allows us to inject a service but then attach it to a variable
    // with the same name as the service.
    beforeEach(inject(function ($controller, $rootScope, _$location_, _$stateParams_, _$httpBackend_, _Authentication_, _Records_) {
      // Set a new global scope
      scope = $rootScope.$new();

      // Point global variables to injected services
      $stateParams = _$stateParams_;
      $httpBackend = _$httpBackend_;
      $location = _$location_;
      Authentication = _Authentication_;
      Records = _Records_;

      // create mock record
      mockRecord = new Records({
        _id: '525a8422f6d0f87f0e407a33',
        title: 'An Record about MEAN',
        content: 'MEAN rocks!'
      });

      // Mock logged in user
      Authentication.user = {
        roles: ['user']
      };

      // Initialize the Records controller.
      RecordsController = $controller('RecordsController', {
        $scope: scope
      });
    }));

    it('$scope.find() should create an array with at least one record object fetched from XHR', inject(function (Records) {
      // Create a sample records array that includes the new record
      var sampleRecords = [mockRecord];

      // Set GET response
      $httpBackend.expectGET('api/records').respond(sampleRecords);

      // Run controller functionality
      scope.find();
      $httpBackend.flush();

      // Test scope value
      expect(scope.records).toEqualData(sampleRecords);
    }));

    it('$scope.findOne() should create an array with one record object fetched from XHR using a recordId URL parameter', inject(function (Records) {
      // Set the URL parameter
      $stateParams.recordId = mockRecord._id;

      // Set GET response
      $httpBackend.expectGET(/api\/records\/([0-9a-fA-F]{24})$/).respond(mockRecord);

      // Run controller functionality
      scope.findOne();
      $httpBackend.flush();

      // Test scope value
      expect(scope.record).toEqualData(mockRecord);
    }));

    describe('$scope.create()', function () {
      var sampleRecordPostData;

      beforeEach(function () {
        // Create a sample record object
        sampleRecordPostData = new Records({
          title: 'An Record about MEAN',
          content: 'MEAN rocks!'
        });

        // Fixture mock form input values
        scope.title = 'An Record about MEAN';
        scope.content = 'MEAN rocks!';

        spyOn($location, 'path');
      });

      it('should send a POST request with the form input values and then locate to new object URL', inject(function (Records) {
        // Set POST response
        $httpBackend.expectPOST('api/records', sampleRecordPostData).respond(mockRecord);

        // Run controller functionality
        scope.create(true);
        $httpBackend.flush();

        // Test form inputs are reset
        expect(scope.title).toEqual('');
        expect(scope.content).toEqual('');

        // Test URL redirection after the record was created
        expect($location.path.calls.mostRecent().args[0]).toBe('records/' + mockRecord._id);
      }));

      it('should set scope.error if save error', function () {
        var errorMessage = 'this is an error message';
        $httpBackend.expectPOST('api/records', sampleRecordPostData).respond(400, {
          message: errorMessage
        });

        scope.create(true);
        $httpBackend.flush();

        expect(scope.error).toBe(errorMessage);
      });
    });

    describe('$scope.update()', function () {
      beforeEach(function () {
        // Mock record in scope
        scope.record = mockRecord;
      });

      it('should update a valid record', inject(function (Records) {
        // Set PUT response
        $httpBackend.expectPUT(/api\/records\/([0-9a-fA-F]{24})$/).respond();

        // Run controller functionality
        scope.update(true);
        $httpBackend.flush();

        // Test URL location to new object
        expect($location.path()).toBe('/records/' + mockRecord._id);
      }));

      it('should set scope.error to error response message', inject(function (Records) {
        var errorMessage = 'error';
        $httpBackend.expectPUT(/api\/records\/([0-9a-fA-F]{24})$/).respond(400, {
          message: errorMessage
        });

        scope.update(true);
        $httpBackend.flush();

        expect(scope.error).toBe(errorMessage);
      }));
    });

    describe('$scope.remove(record)', function () {
      beforeEach(function () {
        // Create new records array and include the record
        scope.records = [mockRecord, {}];

        // Set expected DELETE response
        $httpBackend.expectDELETE(/api\/records\/([0-9a-fA-F]{24})$/).respond(204);

        // Run controller functionality
        scope.remove(mockRecord);
      });

      it('should send a DELETE request with a valid recordId and remove the record from the scope', inject(function (Records) {
        expect(scope.records.length).toBe(1);
      }));
    });

    describe('scope.remove()', function () {
      beforeEach(function () {
        spyOn($location, 'path');
        scope.record = mockRecord;

        $httpBackend.expectDELETE(/api\/records\/([0-9a-fA-F]{24})$/).respond(204);

        scope.remove();
        $httpBackend.flush();
      });

      it('should redirect to records', function () {
        expect($location.path).toHaveBeenCalledWith('records');
      });
    });
  });
}());
