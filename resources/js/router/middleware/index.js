import authorizationMiddleware from "@/router/middleware/authorization.middleware.js";
import loadLayoutMiddleware from "@/router/middleware/loadLayout.middleware.js";
import loginPageMiddleware from "@/router/middleware/loginPage.middleware.js";
import setPageTitleMiddleware from "@/router/middleware/pageTitle.middleware.js";
import roleMiddleware from "@/router/middleware/role.middleware.js";

export { authorizationMiddleware, loadLayoutMiddleware, loginPageMiddleware, roleMiddleware, setPageTitleMiddleware };
