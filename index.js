"use strict";

const createRouter = require("@arangodb/foxx/router");
const router = createRouter();
const joi = require("joi");
const db = require("@arangodb").db;
const sessionDetails = db._collection("sessionDetails");
const request = require("@arangodb/request");
const { generateOTP, isSessionExpired } = require("./utils/index");
const {
  checkCookieTimeValidation,
  checkSessionTimeValidation,
} = require("./middleware/index");
module.context.use(router);

// 3 hour
const maxAge = 3 * 60 * 60 * 1000;

router
  .get("/example", (req, res) => {
    try {
      const cookie = req.cookie("sessionId");

      res.send({ status: "success", cookie: cookie });
    } catch (error) {
      res.send({ status: "bad", error });
    }
  })
  .summary("Get example data")
  .description("Retrieve example data")
  .error(400, "Bad Request")
  .error(500, "Internal Server Error");

router
  .post("/createSession", (req, res) => {
    const { phoneNumber } = req.body;
    const randomNum = generateOTP(6);
    const url = module.context.configuration.SMTP_BASE_URL;
    const apiKey = module.context.configuration.API_KEY_SMTP;

    const response = request.post(url, {
      headers: { Authorization: apiKey },
      body: {
        variables_values: randomNum,
        route: "otp",
        numbers: phoneNumber,
      },
      json: true,
    });

    if (response.status === 200 && response.json.return === true) {
      const sessionCreationTime = Date.now();
      const meta = sessionDetails.save({
        ...req.body,
        sessionId: randomNum,
        time: sessionCreationTime,
      });
      res.cookie("sessionId", randomNum, {
        httpOnly: true,
        ttl: 60, //60 sec
      });
      res.send({
        sessionId: randomNum,
        response: response.json,
        meta: meta,
      });
    } else {
      res.throw(500, "Failed to send OTP");
    }
  })
  .body(
    joi.object().keys({ phoneNumber: joi.string().required() }).required(),
    "body"
  )
  .summary("Create Session")
  .description(
    "Create a new session and send OTP to the provided phone number"
  );

router
  .post("/verifyOTP", checkCookieTimeValidation, (req, res) => {
    try {
      const { sessionId, otp } = req.body;

      const sessionData = sessionDetails.firstExample({ sessionId }); //firstExample is build function of arrangodb

      const url = module.context.configuration.SMTP_BASE_URL;
      const apiKey = module.context.configuration.API_KEY_SMTP;

      const response = request.post(url, {
        headers: { Authorization: apiKey },
        body: {
          message: `Your OTP is ${otp}`,
          variables_values: sessionData.sessionId,
          route: "otp",
          numbers: sessionData.phoneNumber,
        },
        json: true,
      });

      if (response.status === 200 && response.json.return === true) {
        sessionDetails.update(sessionData._id, { verified: true });
        res.send({ message: "OTP verification successful" });
      } else {
        res.send({ message: "no active account" });
      }
    } catch (error) {
      res.throw(500, error);
    }
  })
  .body(
    joi
      .object()
      .keys({
        sessionId: joi.string().required(),
        otp: joi.string().required(),
      })
      .required(),
    "body"
  )
  .summary("Verify OTP")
  .description("Verify the OTP entered by the user using the Fast2SMS API");

router
  .get("/getSession/:sessionId", (req, res) => {
    const { sessionId } = req.pathParams;

    const sessionData = sessionDetails.firstExample({ sessionId });

    const dataTime = sessionData.time;

    if (!isSessionExpired(dataTime, maxAge)) {
      res.throw(401, "Session has expired");
    }

    res.send({ sessionData });
  })
  .pathParam("sessionId", joi.string().required())
  .summary("Get Session")
  .description("Retrieve session data by session ID");

router
  .get("/catalog", checkSessionTimeValidation, (req, res) => {
    try {
      const catalogueCollection = db._collection("catalog");
      const catalogueData = catalogueCollection.all();

      res.send({ catalogueCollection });
    } catch (error) {
      res.throw(500, "Error retrieving catalogue data");
    }
  })
  .summary("service access example")
  .description("handling catalouge route request ");
