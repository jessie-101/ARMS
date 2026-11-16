 const express = require("express");
const cors = require("cors");
require("dotenv").config();


require("./config/db");


const studentRoutes = require("./routes/studentRoutes");
const authRoutes = require("./routes/authRoutes");
const attachmentRoutes = require("./routes/attachmentRoutes");
const logbookRoutes = require("./routes/logbookRoutes");
const supervisorRoutes = require("./routes/supervisorRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");


const app = express();


app.use(cors());

app.use(express.json());



app.use("/api/students", studentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/attachment", attachmentRoutes);
app.use("/api/logbook", logbookRoutes);
app.use("/api/supervisors", supervisorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);



app.get("/", (req,res)=>{

    res.send("ARMS API Running");

});



app.listen(process.env.PORT || 3001, () => {

    console.log(
        `Server running on http://localhost:${process.env.PORT || 3001}`
    );

});