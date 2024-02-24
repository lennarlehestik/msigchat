const express = require('express');
const bodyParser = require('body-parser');
const { Api, JsonRpc, JsSignatureProvider } = require('eosjs'); 
const fetch = require('node-fetch');

const app = express();
const port = 3000;

app.use(bodyParser.json());

const rpc = new JsonRpc('https://eos.greymass.com', { fetch }); 
const api = new Api({ rpc, signatureProvider: new JsSignatureProvider([]) });

app.post('/verify', async (req, res) => {
    const { serializedTransaction, signatures, accountName } = req.body;

    try {
        const deserializedTransaction = api.deserializeTransaction(serializedTransaction);

        const accountInfo = await rpc.get_account(accountName);
        const publicKeys = accountInfo.permissions.map(perm => perm.required_auth.keys[0].key);

        const requiredKeys = await api.authorityProvider.getRequiredKeys({ transaction: deserializedTransaction, availableKeys: publicKeys });
        const isTransactionValid = requiredKeys.every(key => signatures.includes(key)); // Assuming key corresponds to signature

        if(isTransactionValid) {
            res.json({ status: 'success', message: 'Transaction verified successfully' });
        } else {
            res.status(400).json({ status: 'error', message: 'Transaction verification failed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Failed to verify transaction' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
