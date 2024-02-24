const fetchPermissions = async (account, permission, endpoint, fetchedAccounts = new Set(), depth = 0) => {
    const url = `${endpoint}/v1/chain/get_account`;
    try {
        console.log("Fetching permissions for", account, "with permission", permission);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ account_name: account }),
        });

        const data = await response.json();
        // Prepare an array to hold all fetch promises for this level
        const fetchPromises = [];

        for (const perm of data.permissions) {
            if (perm.perm_name === permission) {
                if (perm.required_auth.accounts.length > 0) {
                    perm.required_auth.accounts.forEach(nestedAccount => {
                        if (!fetchedAccounts.has(nestedAccount.permission.actor)) {
                            fetchedAccounts.add(nestedAccount.permission.actor);
                            // Push the fetch operation as a promise into the array without awaiting here
                            fetchPromises.push(fetchPermissions(nestedAccount.permission.actor, nestedAccount.permission.permission, endpoint, fetchedAccounts, depth + 1));
                        }
                    });
                } else if (perm.required_auth.keys.length > 0) {
                    // End of nesting indicated by a permission tied to a public key
                    continue; // Move to the next permission if any, instead of breaking, to ensure all parallel operations are captured
                }
            }
        }

        // Wait for all fetch promises at this level to resolve before proceeding
        await Promise.all(fetchPromises);

        // Only convert the Set to an array at the top level before returning
        if (depth === 0) {
            return Array.from(fetchedAccounts);
        }
        return fetchedAccounts;
    } catch (error) {
        console.error("Error fetching permissions:", error);
        throw error; // Rethrow to allow handling by the caller
    }
};



  export default fetchPermissions;
