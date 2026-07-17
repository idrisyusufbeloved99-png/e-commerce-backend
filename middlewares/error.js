const error = (err, req, res, next) => {
  if (err) {
    console.log("============ Err Stack Trace ===========");
    console.error(err.stack);
    console.log("============ End Stack Trace ===========");

    console.log("============ Err summary ===========");
    console.error(err.message);
    console.log("============ End summary ===========");

     res.status(500).json({
    error: err.message || "Internal Server Error",
  });
  }

};

export default error;
