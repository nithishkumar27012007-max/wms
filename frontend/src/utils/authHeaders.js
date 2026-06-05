export const getAuthHeaders = () => {

    return {
        "Content-Type": "application/json",

        "Authorization":
            `Bearer ${localStorage.getItem("token")}`,

        "session-uuid":
            localStorage.getItem("session_uuid")
    };
};