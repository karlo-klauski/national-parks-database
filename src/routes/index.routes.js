const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', { isAuthenticated: req.oidc.isAuthenticated(), user: req.oidc.user });
});

module.exports = router;