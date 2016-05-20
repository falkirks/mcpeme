'use strict';

var should = require('should'),
  request = require('supertest'),
  path = require('path'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Record = mongoose.model('Record'),
  express = require(path.resolve('./config/lib/express'));

/**
 * Globals
 */
var app, agent, credentials, user, record;

/**
 * Record routes tests
 */
describe('Record CRUD tests', function () {

  before(function (done) {
    // Get application
    app = express.init(mongoose);
    agent = request.agent(app);

    done();
  });

  beforeEach(function (done) {
    // Create user credentials
    credentials = {
      username: 'username',
      password: 'M3@n.jsI$Aw3$0m3'
    };

    // Create a new user
    user = new User({
      firstName: 'Full',
      lastName: 'Name',
      displayName: 'Full Name',
      email: 'test@test.com',
      username: credentials.username,
      password: credentials.password,
      provider: 'local'
    });

    // Save a user to the test db and create new record
    user.save(function () {
      record = {
        title: 'Record Title',
        content: 'Record Content'
      };

      done();
    });
  });

  it('should be able to save an record if logged in', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Get the userId
        var userId = user.id;

        // Save a new record
        agent.post('/api/records')
          .send(record)
          .expect(200)
          .end(function (recordSaveErr, recordSaveRes) {
            // Handle record save error
            if (recordSaveErr) {
              return done(recordSaveErr);
            }

            // Get a list of records
            agent.get('/api/records')
              .end(function (recordsGetErr, recordsGetRes) {
                // Handle record save error
                if (recordsGetErr) {
                  return done(recordsGetErr);
                }

                // Get records list
                var records = recordsGetRes.body;

                // Set assertions
                (records[0].user._id).should.equal(userId);
                (records[0].title).should.match('Record Title');

                // Call the assertion callback
                done();
              });
          });
      });
  });

  it('should not be able to save an record if not logged in', function (done) {
    agent.post('/api/records')
      .send(record)
      .expect(403)
      .end(function (recordSaveErr, recordSaveRes) {
        // Call the assertion callback
        done(recordSaveErr);
      });
  });

  it('should not be able to save an record if no title is provided', function (done) {
    // Invalidate title field
    record.title = '';

    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Get the userId
        var userId = user.id;

        // Save a new record
        agent.post('/api/records')
          .send(record)
          .expect(400)
          .end(function (recordSaveErr, recordSaveRes) {
            // Set message assertion
            (recordSaveRes.body.message).should.match('Title cannot be blank');

            // Handle record save error
            done(recordSaveErr);
          });
      });
  });

  it('should be able to update an record if signed in', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Get the userId
        var userId = user.id;

        // Save a new record
        agent.post('/api/records')
          .send(record)
          .expect(200)
          .end(function (recordSaveErr, recordSaveRes) {
            // Handle record save error
            if (recordSaveErr) {
              return done(recordSaveErr);
            }

            // Update record title
            record.title = 'WHY YOU GOTTA BE SO MEAN?';

            // Update an existing record
            agent.put('/api/records/' + recordSaveRes.body._id)
              .send(record)
              .expect(200)
              .end(function (recordUpdateErr, recordUpdateRes) {
                // Handle record update error
                if (recordUpdateErr) {
                  return done(recordUpdateErr);
                }

                // Set assertions
                (recordUpdateRes.body._id).should.equal(recordSaveRes.body._id);
                (recordUpdateRes.body.title).should.match('WHY YOU GOTTA BE SO MEAN?');

                // Call the assertion callback
                done();
              });
          });
      });
  });

  it('should be able to get a list of records if not signed in', function (done) {
    // Create new record model instance
    var recordObj = new Record(record);

    // Save the record
    recordObj.save(function () {
      // Request records
      request(app).get('/api/records')
        .end(function (req, res) {
          // Set assertion
          res.body.should.be.instanceof(Array).and.have.lengthOf(1);

          // Call the assertion callback
          done();
        });

    });
  });

  it('should be able to get a single record if not signed in', function (done) {
    // Create new record model instance
    var recordObj = new Record(record);

    // Save the record
    recordObj.save(function () {
      request(app).get('/api/records/' + recordObj._id)
        .end(function (req, res) {
          // Set assertion
          res.body.should.be.instanceof(Object).and.have.property('title', record.title);

          // Call the assertion callback
          done();
        });
    });
  });

  it('should return proper error for single record with an invalid Id, if not signed in', function (done) {
    // test is not a valid mongoose Id
    request(app).get('/api/records/test')
      .end(function (req, res) {
        // Set assertion
        res.body.should.be.instanceof(Object).and.have.property('message', 'Record is invalid');

        // Call the assertion callback
        done();
      });
  });

  it('should return proper error for single record which doesnt exist, if not signed in', function (done) {
    // This is a valid mongoose Id but a non-existent record
    request(app).get('/api/records/559e9cd815f80b4c256a8f41')
      .end(function (req, res) {
        // Set assertion
        res.body.should.be.instanceof(Object).and.have.property('message', 'No record with that identifier has been found');

        // Call the assertion callback
        done();
      });
  });

  it('should be able to delete an record if signed in', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Get the userId
        var userId = user.id;

        // Save a new record
        agent.post('/api/records')
          .send(record)
          .expect(200)
          .end(function (recordSaveErr, recordSaveRes) {
            // Handle record save error
            if (recordSaveErr) {
              return done(recordSaveErr);
            }

            // Delete an existing record
            agent.delete('/api/records/' + recordSaveRes.body._id)
              .send(record)
              .expect(200)
              .end(function (recordDeleteErr, recordDeleteRes) {
                // Handle record error error
                if (recordDeleteErr) {
                  return done(recordDeleteErr);
                }

                // Set assertions
                (recordDeleteRes.body._id).should.equal(recordSaveRes.body._id);

                // Call the assertion callback
                done();
              });
          });
      });
  });

  it('should not be able to delete an record if not signed in', function (done) {
    // Set record user
    record.user = user;

    // Create new record model instance
    var recordObj = new Record(record);

    // Save the record
    recordObj.save(function () {
      // Try deleting record
      request(app).delete('/api/records/' + recordObj._id)
        .expect(403)
        .end(function (recordDeleteErr, recordDeleteRes) {
          // Set message assertion
          (recordDeleteRes.body.message).should.match('User is not authorized');

          // Handle record error error
          done(recordDeleteErr);
        });

    });
  });

  afterEach(function (done) {
    User.remove().exec(function () {
      Record.remove().exec(done);
    });
  });
});
