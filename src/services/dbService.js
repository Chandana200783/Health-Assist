import { db } from "../firebase";
import {
    collection,
    doc,
    setDoc,
    addDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    getDocs,
    serverTimestamp
} from "firebase/firestore";

// --- User Operations ---

export async function updateUserProfile(userId, data) {
    // Basic profile updates always go to the main user doc for simplicity in this MVP
    // If updating a family member's specific score, would be different, but for now assuming 'userId' here is the main auth uid
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// --- Health Metrics Operations ---

export async function saveHealthMetric(userId, type, result, imageUrl = null, profileId = null) {
    const metricsRef = collection(db, "health_metrics");
    await addDoc(metricsRef, {
        userId, // Auth UID
        profileId: profileId || userId, // Target Profile ID (defaults to Auth UID)
        type, // 'lab_report' or 'manual'
        date: serverTimestamp(),
        metrics: result,
        sourceImageUri: imageUrl
    });
}

export async function getHealthMetrics(userId, profileId = null) {
    const q = query(
        collection(db, "health_metrics"),
        where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Map doc to data

    // Filter by profileId if provided, otherwise default to items belonging to the user directly
    const targetProfileId = profileId || userId;
    const filteredData = data.filter(item => {
        // Match if item.profileId exists and matches target
        if (item.profileId) return item.profileId === targetProfileId;
        // Backward compatibility: if no profileId, assume it belongs to the main user (userId)
        return targetProfileId === userId;
    });

    // Sort client-side to avoid composite index requirement
    return filteredData.sort((a, b) => {
        const dateA = a.date?.seconds || 0;
        const dateB = b.date?.seconds || 0;
        return dateB - dateA;
    });
}


// --- Meal Log Operations ---

export async function saveMealLog(userId, result, imageUrl = null) {
    const mealsRef = collection(db, "meal_logs");
    await addDoc(mealsRef, {
        userId,
        timestamp: serverTimestamp(),
        items: result.items,
        totalCalories: result.total_calories,
        imageUrl
    });
}

export async function getMealLogs(userId) {
    const q = query(
        collection(db, "meal_logs"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- Reminder Operations ---

export async function saveReminder(userId, reminderData) {
    const ref = collection(db, "reminders");
    await addDoc(ref, {
        userId,
        createdAt: serverTimestamp(),
        ...reminderData
    });
}

export async function getReminders(userId) {
    // Sort by date then time
    const q = query(
        collection(db, "reminders"),
        where("userId", "==", userId),
        orderBy("date", "asc"),
        orderBy("time", "asc")
    );
    // Note: This composite index might need to be created in Firebase Console.
    // Fallback if index missing is just sorting by time for now if date is same.

    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        // Fallback for missing index or old data
        console.warn("Index query failed, falling back to simple query", e);
        const simpleQ = query(
            collection(db, "reminders"),
            where("userId", "==", userId)
        );
        const snapshot = await getDocs(simpleQ);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}

export async function deleteReminder(reminderId) {
    await deleteDoc(doc(db, "reminders", reminderId));
}

export async function updateReminder(reminderId, data) {
    const ref = doc(db, "reminders", reminderId);
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// --- Health Expense Operations ---

export async function saveExpense(userId, expenseData) {
    // We use health_metrics collection because 'expenses' collection permissions are not set up
    const ref = collection(db, "health_metrics");
    await addDoc(ref, {
        userId,
        type: 'expense',
        date: expenseData.date || serverTimestamp(), // Use user date for sorting if string, or TS. Ideally consistent.
        // Actually, let's use the provided date as the main sorting key if we can, but Dashboard expects serverTimestamp probably.
        // To be safe and compatible with other metrics, we'll use serverTimestamp for 'date' (creation) and store specific date in metrics.
        // Wait, if we use serverTimestamp for 'date', we can't backdate easily in the main index.
        // Let's just use the provided date string/object. Firestore can sort mixed types, or we filter client side.
        // Safest: Use ISO string for expense date but store in 'metrics'. Use serverTimestamp for 'date' to keep 'getHealthMetrics' happy.
        date: serverTimestamp(),
        metrics: expenseData
    });
}

export async function getExpenses(userId) {
    // Query without orderBy to avoid index issues. Sort client-side.
    const q = query(
        collection(db, "health_metrics"),
        where("userId", "==", userId)
    );

    try {
        const snapshot = await getDocs(q);
        const allMetrics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter for expenses and format
        return allMetrics
            .filter(m => m.type === 'expense')
            .map(m => ({
                id: m.id,
                ...m.metrics, // Flatten metrics up
                userId: m.userId,
                // If the expense has a specific date, prefer it.
                date: m.metrics?.date || (m.date?.toDate ? m.date.toDate().toISOString() : m.date)
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by expense date

    } catch (e) {
        console.warn("Index query failed for expenses refactor, falling back", e);
        return [];
    }
}
