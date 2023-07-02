"use strict";

function checkCookieTimeValidation(req, res, next) {
  try {
    const cookie = req.cookie("sessionId");
    if (cookie) {
      next();
    } else {
      throw new Error("Your Verify number is not valid anymore");
    }
  } catch (error) {
    res.send({ status: 400, error: "Your Verify number is not valid anymore" });
  }
}
function checkSessionTimeValidation(req, res, next) {
  const sessionId = req.cookie("sessionId");

  if (sessionId) {
    next();
  } else {
    res.throw(401, "Unauthorized");
  }
}

module.exports = { checkCookieTimeValidation, checkSessionTimeValidation };
