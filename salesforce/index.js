require('dotenv').config();
const jsforce = require('jsforce');
const { SFDC_OPPTY_RECORD_ID, SFDC_SELECT_QUERY } = require('../constants');

const conn = new jsforce.Connection({ loginUrl: process.env.SFDC_LOGIN_URL });
// Salesforce API Integrations
// ------------------------------

const login = async () => {
  try {
    return await conn.login(
      process.env.SFDC_USERNAME,
      process.env.SFDC_PASSWORD,
      (err, userInfo) => userInfo,
    );
  } catch (error) {
    return error;
  }
};

const generateWhereClause = (courseStart, courseType) => `RecordTypeId = '${SFDC_OPPTY_RECORD_ID}'
AND Course_Product__c = 'Web Development'
AND Course_Start_Date_Actual__c = ${courseStart}
AND Course_Type__c LIKE '%${courseType}%'`;

const formatStudents = (students) => {
  const formattedStudents = students.map((student) => {
    const contact = student.Student__r || {};
    return {
      fullName: contact.Name,
      email: contact.Email,
      emailSecondary: contact.Secondary_Email__c,
      campus: student.Campus_Formatted__c,
      github: contact.Github_Username__c,
      courseStartDate: student.Course_Start_Date_Actual__c,
      productCode: student.Product_Code__c,
      stage: student.StageName,
      separationStatus: student.Separation_Status__c,
      separationType: student.Separation_Type__c,
      separationReason: student.Separation_Reason__c,
      lastDayOfAttendance: student.Last_Day_Of_Attendance__c,
      lastDayOfAttendanceAcronym: student.Last_Day_of_Attendance_Acronym__c,
      dateOfDetermination: student.Official_Withdrawal_Date__c,
      sfdcContactId: student.Student__c,
      sfdcOpportunityId: student.Id,
    };
  });
  return formattedStudents;
};

exports.getStudents = async (courseStart, courseType) => {
  try {
    await login();
    return await conn.sobject('Opportunity')
      .select(SFDC_SELECT_QUERY)
      .where(generateWhereClause(courseStart, courseType))
      .orderby('CreatedDate', 'DESC')
      .execute((err, res) => {
        if (err) throw new Error('SALESFORCE ERROR', err);
        const formattedStudents = formatStudents(res);
        return formattedStudents;
      });
  } catch (error) {
    return error;
  }
};

exports.getStudentsByReportID = async (reportID) => {
  try {
    await login();
    const report = conn.analytics.report(reportID);
    return await report.execute({ details: true }, (err, result) => {
      if (err) throw new Error('SALESFORCE ERROR', err);
      const { rows } = result.factMap['T!T'];
      const formattedStudents = rows.map((row) => result.reportMetadata.detailColumns
        .reduce((a, b, i) => (a[b] = row.dataCells[i].value, a), {}));
      return formattedStudents;
    });
  } catch (error) {
    return error;
  }
};
