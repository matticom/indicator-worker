'use strict';

require('dotenv').config();

require('express-async-errors');
const fs = require('fs');

import express from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cors from 'cors';
import { getResult } from './src/controllers/SimulationController';

import http from 'http';
import CommunicationService from './src/services/CommunicationService';
import TestRouter from './src/routes/TestRouter';

const port = process.env.PORT || 8100;
const app = express();

const httpServer = http.createServer(app);
CommunicationService.startService(httpServer);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use(helmet());

// app.use('/viewers', ViewersRouter);
// app.use('/simulation', getResult);

// getHistoricalData().then((historicalData) => {
//    console.log('historicalData :>> ', historicalData);

// });

app.use('/', TestRouter);

/**
 * Catch-all
 */
app.all('*', function (req, res) {
   return res.status(404).send('The requested URL was not found on this server');
});

/**
 * Error handling
 */
app.use(function (err, req, res, next) {
   console.log('error occurred :', err);

   const errorResponse = err.response
      ? {
           status: err.response.status,
           statusText: err.response.statusText,
           url: err.response.config.url,
           method: err.response.config.method,
           stack: err.stack,
        }
      : err.toString();

   res.status(500).json({
      error: errorResponse,
   });
});

/**
 * Start server
 */
// app.listen(port, function (err) {
httpServer.listen(port, function (err) {
   if (err !== undefined) {
      console.error(err);
      return;
   }

   console.info('Listening on port ' + port);
});
