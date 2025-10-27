function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
}

function isNotAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
}

module.exports = {
    isAuthenticated,
    isNotAuthenticated
};
