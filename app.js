#!/usr/bin/env node

'use strict';

// Require lodash first to merge config and secrets
const _ = require('lodash');

// Configuration
const environment = process.env.NODE_ENV || 'development';
const config      = _.merge(require('./config'), require('./secrets'))[environment];

// External dependencies
const util       = require('util')
const http       = require('http');
const https      = require('https');
const express    = require('express');
const bodyParser = require('body-parser');
const morgan     = require('morgan')(config.morgan);
const validator  = require('express-validator')(config.validator);
const session    = require('express-session')(config.session);
const grant      = require('grant-express')(config.grant);

// Application dependencies
const models = require('./models');

// Create express app
const app = express();

// Configure middlewares
app.use(morgan);
app.use(session);
app.use(bodyParser.json());
app.use(grant);
app.use(validator);

// Configure routes
const router = express.Router();
router.route('/users/:userId')
    .post((req, res) => {
        // Validate
        req.checkBody({
            'username': {
                notEmpty: true,
                isLength: {
                    options: [{min: 3, max: 20}],
                },
                isAlpha: true,
                errorMessage: 'Invalid username'
            },
            'email': {
                notEmpty: true,
                isEmail: {
                    errorMessage: 'Invalid email'
                }
            },
            'password': {
                notEmpty: true,
                isLength: {
                    options: [{min: 8}],
                },
                errorMessage: 'Invalid Password'
            }
        });

        // Report errors
        const errors = req.validationErrors();
        if (errors) {
            res.status(400).send('There have been validation errors: ' + util.inspect(errors));
            return;
        }

        // Save user
        const user = {
            username: req.body.username,
            email: req.body.email,
            password_hash: 'test'
        };
        models.users.create(user);

        // Return user
        res.json(user);
    })
    .get((req, res) => {
        res.json({
            username: 'username',
            email: 'example@example.com'
        })
    });

router.route('/connected')
    .get((req, res) => {
        console.log(req.query)
        res.end(JSON.stringify(req.query, null, 2))
    });

// Register routes
app.use('/', router);

// Start server(s)
if (config.http) {
    http.createServer(app).listen(config.http.port);
    console.log('HTTP  server listening on port', config.http.port);
}
if (config.https) {
    https.createServer(config.https.options, app).listen(config.https.port);
    console.log('HTTPS server listening on port', config.https.port);
}
