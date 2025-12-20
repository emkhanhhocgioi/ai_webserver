const UserActivity = require('../schema/user_activities');

/**
 * Log user activity
 * @param {Object} params - Activity parameters
 * @param {String} params.userId - ID of the user (student or teacher)
 * @param {String} params.role - Role of the user ('student' or 'teacher')
 * @param {String} params.action - Description of the action
 * @param {String} [params.testId] - Optional test ID
 * @param {String} [params.lessonId] - Optional lesson ID
 */
const logActivity = async ({ userId, role, action, testId = null, lessonId = null }) => {
    try {
        const activityData = {
            role,
            action,
            testId,
            lessonId
        };

        // Set the appropriate user ID based on role
        if (role === 'teacher') {
            activityData.teacherId = userId;
        } else if (role === 'student') {
            activityData.studentId = userId;
        }

        const activity = new UserActivity(activityData);
        await activity.save();
        
        return activity;
    } catch (error) {
        console.error('Error logging user activity:', error);
        // Don't throw error to prevent breaking main functionality
        return null;
    }
};

/**
 * Get user activities
 * @param {String} userId - User ID
 * @param {String} role - User role
 * @param {Number} limit - Number of activities to return
 */
const getUserActivities = async (userId, role, limit = 50) => {
    try {
        const query = role === 'teacher' 
            ? { teacherId: userId }
            : { studentId: userId };

        const activities = await UserActivity.find(query)
            .populate('testId', 'testtitle subject')
            .populate('lessonId', 'title subject')
            .sort({ createdAt: -1 })
            .limit(limit);

        return activities;
    } catch (error) {
        console.error('Error fetching user activities:', error);
        return [];
    }
};

module.exports = {
    logActivity,
    getUserActivities
};
