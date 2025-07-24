const isAdmin = (req, res, next) => {
  if (!req.user || (!req.user.isAdmin && req.user.role !== 'admin')) {
    return res.status(403).json({ 
      message: 'Access denied. Admin only.',
      user: req.user ? { role: req.user.role, isAdmin: req.user.isAdmin } : null
    });
  }
  next();
};

module.exports = isAdmin; 