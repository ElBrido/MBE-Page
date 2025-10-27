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

function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).render('error', { 
        error: { message: 'Access denied. Admin privileges required.' }
    });
}

module.exports = {
    isAuthenticated,
    isNotAuthenticated,
    isAdmin
};
