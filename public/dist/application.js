'use strict';

// Init the application configuration module for AngularJS application
var ApplicationConfiguration = (function () {
  // Init module configuration options
  var applicationModuleName = 'mean';
  var applicationModuleVendorDependencies = ['ngResource', 'ngAnimate', 'ngMessages', 'ui.router', 'ui.bootstrap', 'ui.utils', 'angularFileUpload'];

  // Add a new vertical module
  var registerModule = function (moduleName, dependencies) {
    // Create angular module
    angular.module(moduleName, dependencies || []);

    // Add the module to the AngularJS configuration file
    angular.module(applicationModuleName).requires.push(moduleName);
  };

  return {
    applicationModuleName: applicationModuleName,
    applicationModuleVendorDependencies: applicationModuleVendorDependencies,
    registerModule: registerModule
  };
})();

'use strict';

//Start by defining the main module and adding the module dependencies
angular.module(ApplicationConfiguration.applicationModuleName, ApplicationConfiguration.applicationModuleVendorDependencies);

// Setting HTML5 Location Mode
angular.module(ApplicationConfiguration.applicationModuleName).config(['$locationProvider', '$httpProvider',
  function ($locationProvider, $httpProvider) {
    $locationProvider.html5Mode(true).hashPrefix('!');

    $httpProvider.interceptors.push('authInterceptor');
  }
]);

angular.module(ApplicationConfiguration.applicationModuleName).run(["$rootScope", "$state", "Authentication", function ($rootScope, $state, Authentication) {

  // Check authentication before changing state
  $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
    if (toState.data && toState.data.roles && toState.data.roles.length > 0) {
      var allowed = false;
      toState.data.roles.forEach(function (role) {
        if (Authentication.user.roles !== undefined && Authentication.user.roles.indexOf(role) !== -1) {
          allowed = true;
          return true;
        }
      });

      if (!allowed) {
        event.preventDefault();
        if (Authentication.user !== undefined && typeof Authentication.user === 'object') {
          $state.go('forbidden');
        } else {
          $state.go('authentication.signin').then(function () {
            storePreviousState(toState, toParams);
          });
        }
      }
    }
  });

  // Record previous state
  $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
    storePreviousState(fromState, fromParams);
  });

  // Store previous state
  function storePreviousState(state, params) {
    // only store this state if it shouldn't be ignored 
    if (!state.data || !state.data.ignoreState) {
      $state.previous = {
        state: state,
        params: params,
        href: $state.href(state, params)
      };
    }
  }
}]);

//Then define the init function for starting up the application
angular.element(document).ready(function () {
  //Fixing facebook bug with redirect
  if (window.location.hash && window.location.hash === '#_=_') {
    if (window.history && history.pushState) {
      window.history.pushState('', document.title, window.location.pathname);
    } else {
      // Prevent scrolling by storing the page's current scroll offset
      var scroll = {
        top: document.body.scrollTop,
        left: document.body.scrollLeft
      };
      window.location.hash = '';
      // Restore the scroll offset, should be flicker free
      document.body.scrollTop = scroll.top;
      document.body.scrollLeft = scroll.left;
    }
  }

  //Then init the app
  angular.bootstrap(document, [ApplicationConfiguration.applicationModuleName]);
});

'use strict';

// Use Applicaion configuration module to register a new module
ApplicationConfiguration.registerModule('core');
ApplicationConfiguration.registerModule('core.admin', ['core']);
ApplicationConfiguration.registerModule('core.admin.routes', ['ui.router']);

'use strict';

// Use Applicaion configuration module to register a new module
ApplicationConfiguration.registerModule('records');

'use strict';

// Use Applicaion configuration module to register a new module
ApplicationConfiguration.registerModule('users', ['core']);
ApplicationConfiguration.registerModule('users.admin', ['core.admin']);
ApplicationConfiguration.registerModule('users.admin.routes', ['core.admin.routes']);

'use strict';

angular.module('core.admin').run(['Menus',
  function (Menus) {
    Menus.addMenuItem('topbar', {
      title: 'Admin',
      state: 'admin',
      type: 'dropdown',
      roles: ['admin']
    });
  }
]);

'use strict';

// Setting up route
angular.module('core.admin.routes').config(['$stateProvider',
  function ($stateProvider) {
    $stateProvider
      .state('admin', {
        abstract: true,
        url: '/admin',
        template: '<ui-view/>',
        data: {
          roles: ['admin']
        }
      });
  }
]);

'use strict';

// Setting up route
angular.module('core').config(['$stateProvider', '$urlRouterProvider',
  function ($stateProvider, $urlRouterProvider) {

    // Redirect to 404 when route not found
    $urlRouterProvider.otherwise(function ($injector, $location) {
      $injector.get('$state').transitionTo('not-found', null, {
        location: false
      });
    });

    // Home state routing
    $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'modules/core/client/views/home.client.view.html'
    })
    .state('not-found', {
      url: '/not-found',
      templateUrl: 'modules/core/client/views/404.client.view.html',
      data: {
        ignoreState: true
      }
    })
    .state('bad-request', {
      url: '/bad-request',
      templateUrl: 'modules/core/client/views/400.client.view.html',
      data: {
        ignoreState: true
      }
    })
    .state('forbidden', {
      url: '/forbidden',
      templateUrl: 'modules/core/client/views/403.client.view.html',
      data: {
        ignoreState: true
      }
    });
  }
]);

'use strict';

angular.module('core').controller('HeaderController', ['$scope', '$state', 'Authentication', 'Menus',
  function ($scope, $state, Authentication, Menus) {
    // Expose view variables
    $scope.$state = $state;
    $scope.authentication = Authentication;

    // Get the topbar menu
    $scope.menu = Menus.getMenu('topbar');

    // Toggle the menu items
    $scope.isCollapsed = false;
    $scope.toggleCollapsibleMenu = function () {
      $scope.isCollapsed = !$scope.isCollapsed;
    };

    // Collapsing the menu after navigation
    $scope.$on('$stateChangeSuccess', function () {
      $scope.isCollapsed = false;
    });
  }
]);

'use strict';

angular.module('core').controller('HomeController', ['$scope', 'Authentication',
  function ($scope, Authentication) {
    // This provides Authentication context.
    $scope.authentication = Authentication;
  }
]);

'use strict';

/**
 * Edits by Ryan Hutchison
 * Credit: https://github.com/paulyoder/angular-bootstrap-show-errors */

angular.module('core')
  .directive('showErrors', ['$timeout', '$interpolate', function ($timeout, $interpolate) {
    var linkFn = function (scope, el, attrs, formCtrl) {
      var inputEl, inputName, inputNgEl, options, showSuccess, toggleClasses,
        initCheck = false,
        showValidationMessages = false,
        blurred = false;

      options = scope.$eval(attrs.showErrors) || {};
      showSuccess = options.showSuccess || false;
      inputEl = el[0].querySelector('.form-control[name]') || el[0].querySelector('[name]');
      inputNgEl = angular.element(inputEl);
      inputName = $interpolate(inputNgEl.attr('name') || '')(scope);

      if (!inputName) {
        throw 'show-errors element has no child input elements with a \'name\' attribute class';
      }

      var reset = function () {
        return $timeout(function () {
          el.removeClass('has-error');
          el.removeClass('has-success');
          showValidationMessages = false;
        }, 0, false);
      };

      scope.$watch(function () {
        return formCtrl[inputName] && formCtrl[inputName].$invalid;
      }, function (invalid) {
        return toggleClasses(invalid);
      });

      scope.$on('show-errors-check-validity', function (event, name) {
        if (angular.isUndefined(name) || formCtrl.$name === name) {
          initCheck = true;
          showValidationMessages = true;

          return toggleClasses(formCtrl[inputName].$invalid);
        }
      });

      scope.$on('show-errors-reset', function (event, name) {
        if (angular.isUndefined(name) || formCtrl.$name === name) {
          return reset();
        }
      });

      toggleClasses = function (invalid) {
        el.toggleClass('has-error', showValidationMessages && invalid);
        if (showSuccess) {
          return el.toggleClass('has-success', showValidationMessages && !invalid);
        }
      };
    };

    return {
      restrict: 'A',
      require: '^form',
      compile: function (elem, attrs) {
        if (attrs.showErrors.indexOf('skipFormGroupCheck') === -1) {
          if (!(elem.hasClass('form-group') || elem.hasClass('input-group'))) {
            throw 'show-errors element does not have the \'form-group\' or \'input-group\' class';
          }
        }
        return linkFn;
      }
    };
  }]);

'use strict';

angular.module('core').factory('authInterceptor', ['$q', '$injector',
  function ($q, $injector) {
    return {
      responseError: function(rejection) {
        if (!rejection.config.ignoreAuthModule) {
          switch (rejection.status) {
            case 401:
              $injector.get('$state').transitionTo('authentication.signin');
              break;
            case 403:
              $injector.get('$state').transitionTo('forbidden');
              break;
          }
        }
        // otherwise, default behaviour
        return $q.reject(rejection);
      }
    };
  }
]);

'use strict';

//Menu service used for managing  menus
angular.module('core').service('Menus', [
  function () {
    // Define a set of default roles
    this.defaultRoles = ['user', 'admin'];

    // Define the menus object
    this.menus = {};

    // A private function for rendering decision
    var shouldRender = function (user) {
      if (!!~this.roles.indexOf('*')) {
        return true;
      } else {
        if(!user) {
          return false;
        }
        for (var userRoleIndex in user.roles) {
          for (var roleIndex in this.roles) {
            if (this.roles[roleIndex] === user.roles[userRoleIndex]) {
              return true;
            }
          }
        }
      }

      return false;
    };

    // Validate menu existance
    this.validateMenuExistance = function (menuId) {
      if (menuId && menuId.length) {
        if (this.menus[menuId]) {
          return true;
        } else {
          throw new Error('Menu does not exist');
        }
      } else {
        throw new Error('MenuId was not provided');
      }

      return false;
    };

    // Get the menu object by menu id
    this.getMenu = function (menuId) {
      // Validate that the menu exists
      this.validateMenuExistance(menuId);

      // Return the menu object
      return this.menus[menuId];
    };

    // Add new menu object by menu id
    this.addMenu = function (menuId, options) {
      options = options || {};

      // Create the new menu
      this.menus[menuId] = {
        roles: options.roles || this.defaultRoles,
        items: options.items || [],
        shouldRender: shouldRender
      };

      // Return the menu object
      return this.menus[menuId];
    };

    // Remove existing menu object by menu id
    this.removeMenu = function (menuId) {
      // Validate that the menu exists
      this.validateMenuExistance(menuId);

      // Return the menu object
      delete this.menus[menuId];
    };

    // Add menu item object
    this.addMenuItem = function (menuId, options) {
      options = options || {};

      // Validate that the menu exists
      this.validateMenuExistance(menuId);

      // Push new menu item
      this.menus[menuId].items.push({
        title: options.title || '',
        state: options.state || '',
        type: options.type || 'item',
        class: options.class,
        roles: ((options.roles === null || typeof options.roles === 'undefined') ? this.defaultRoles : options.roles),
        position: options.position || 0,
        items: [],
        shouldRender: shouldRender
      });

      // Add submenu items
      if (options.items) {
        for (var i in options.items) {
          this.addSubMenuItem(menuId, options.state, options.items[i]);
        }
      }

      // Return the menu object
      return this.menus[menuId];
    };

    // Add submenu item object
    this.addSubMenuItem = function (menuId, parentItemState, options) {
      options = options || {};

      // Validate that the menu exists
      this.validateMenuExistance(menuId);

      // Search for menu item
      for (var itemIndex in this.menus[menuId].items) {
        if (this.menus[menuId].items[itemIndex].state === parentItemState) {
          // Push new submenu item
          this.menus[menuId].items[itemIndex].items.push({
            title: options.title || '',
            state: options.state || '',
            roles: ((options.roles === null || typeof options.roles === 'undefined') ? this.menus[menuId].items[itemIndex].roles : options.roles),
            position: options.position || 0,
            shouldRender: shouldRender
          });
        }
      }

      // Return the menu object
      return this.menus[menuId];
    };

    // Remove existing menu object by menu id
    this.removeMenuItem = function (menuId, menuItemState) {
      // Validate that the menu exists
      this.validateMenuExistance(menuId);

      // Search for menu item to remove
      for (var itemIndex in this.menus[menuId].items) {
        if (this.menus[menuId].items[itemIndex].state === menuItemState) {
          this.menus[menuId].items.splice(itemIndex, 1);
        }
      }

      // Return the menu object
      return this.menus[menuId];
    };

    // Remove existing menu object by menu id
    this.removeSubMenuItem = function (menuId, submenuItemState) {
      // Validate that the menu exists
      this.validateMenuExistance(menuId);

      // Search for menu item to remove
      for (var itemIndex in this.menus[menuId].items) {
        for (var subitemIndex in this.menus[menuId].items[itemIndex].items) {
          if (this.menus[menuId].items[itemIndex].items[subitemIndex].state === submenuItemState) {
            this.menus[menuId].items[itemIndex].items.splice(subitemIndex, 1);
          }
        }
      }

      // Return the menu object
      return this.menus[menuId];
    };

    //Adding the topbar menu
    this.addMenu('topbar', {
      roles: ['*']
    });
  }
]);

'use strict';

// Create the Socket.io wrapper service
angular.module('core').service('Socket', ['Authentication', '$state', '$timeout',
  function (Authentication, $state, $timeout) {
    // Connect to Socket.io server
    this.connect = function () {
      // Connect only when authenticated
      if (Authentication.user) {
        this.socket = io();
      }
    };
    this.connect();

    // Wrap the Socket.io 'on' method
    this.on = function (eventName, callback) {
      if (this.socket) {
        this.socket.on(eventName, function (data) {
          $timeout(function () {
            callback(data);
          });
        });
      }
    };

    // Wrap the Socket.io 'emit' method
    this.emit = function (eventName, data) {
      if (this.socket) {
        this.socket.emit(eventName, data);
      }
    };

    // Wrap the Socket.io 'removeListener' method
    this.removeListener = function (eventName) {
      if (this.socket) {
        this.socket.removeListener(eventName);
      }
    };
  }
]);

'use strict';

// Configuring the Records module
angular.module('records').run(['Menus',
  function (Menus) {
    // Add the records dropdown item

    // Add the dropdown list item
    Menus.addMenuItem('topbar', {
      title: 'Registry Listing',
      state: 'records.list'
    });

    // Add the dropdown create item
    Menus.addMenuItem('topbar', {
      title: 'Create Record',
      state: 'records.create',
      roles: ['user']
    });

    Menus.addMenuItem('topbar', {
      title: 'My records',
      state: 'records.mine',
      roles: ['user']
    });
  }
]);

'use strict';

// Setting up route
angular.module('records').config(['$stateProvider',
  function ($stateProvider) {
    // Records state routing
    $stateProvider
      .state('records', {
        abstract: true,
        url: '/records',
        template: '<ui-view/>'
      })
      .state('records.list', {
        url: '',
        templateUrl: 'modules/records/client/views/list-records.client.view.html'
      })
      .state('records.mine', {
        url: '/mine',
        templateUrl: 'modules/records/client/views/my-records.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('records.create', {
        url: '/create',
        templateUrl: 'modules/records/client/views/create-record.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('records.view', {
        url: '/:recordId',
        templateUrl: 'modules/records/client/views/view-record.client.view.html'
      })
      .state('records.edit', {
        url: '/:recordId/edit',
        templateUrl: 'modules/records/client/views/edit-record.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      });
  }
]);

'use strict';

// Records controller
angular.module('records').controller('RecordsController', ['$scope', '$filter', '$stateParams', '$location', 'Authentication', 'Records',
  function ($scope, $filter, $stateParams, $location, Authentication, Records) {
    $scope.authentication = Authentication;
    $scope.user = Authentication.user;

    //FIXME ROLLOUT FEATURE: remove later
    $scope.usedNames = ['pandacraft','0.12.0-beta','server.community','0.12','minepro','100','poodieboy','101','talisarena','104.223.37.159','mcpe.plex','10c4','new.happycraft','121','playfactiontr','123321','realcraft','123','splatterholocaust','13skies','torchpvp','14upload','171.248.20.28','mihai','193.168.1.5','mouadox','1v1','ocelotland','1v1nation','pe.wolucky','1vs1','play-tmsnet','2.0parkour','pvpcraft','21212','rosocraft','2dgamer','skyblocktr','420yeet','super','4cousins','thecrewnet','magmarealms','ultimatecrafttr','4lifecraft','4life','matrixgames','4tactusgaminghd','megdefgt','4tawa','minecraft-romania','503server','minimine','5dlkrsala','mzg','6996','nihalcraft','6iclass','onyxcraftok','a1.battlekits','pe.district15','abc123','pjswag','abraxaspvp','play-meraki','accraft','pocketcraft','ace','prodragonslayer','acepe','ragehighschool','acexfaction','renerivs','ac-mcpe','saul','acraftbeta','shellcraft','acraftbta','smashpe','acraftbt','starwars','acraftfc','survivavalpe','acraftf','tehsever','acraft','thesvile','acraftpebeta','turbocraft','acraftpe','vanillacraft','acraftpetr','lul','acrafttr','marceli16','aditzupe','mcgthsv01','adminfr','mcvs','adminvision','mesro','admir','minecake','adventcraft','minekeykitpvp','advent','mineyork','adventure-island','moline','adv','mustangcraft','aec','nc-hub','aerosmith','nickercraft2016','afci','northmen','agaming468','omegarealms','aimanrusydan','orbitfactions','akarcraft','pascal25565','akauan','pempire','aky','pigluigi','aldoyds','playcraft567','alejandro','play.infinitypvp','alewst_','play.sevastolink','alexchoicy','plexycraftpe','alexis','pocket','alex','ppyrex','alialpsena','ptinsanitype','alialpsenasurvival','pyrexx','ali','rbc','allah','refine09','all','robbie20232','alphacraft','runewd','alphagames','scp','alphahigh','sgpe','alvz','sinatracraft','amyiahserver','skywarspe','anchor','soupland','ancient','srpvp','anddy1','sultan-331','andriassy','survival101','angrydonkey','swagpvp','anime','teambloxheadspleef','animeworld','test','ankitpocketdock','themacrossmc','anonplayz','titanorigins','anonymous','treyeangle','anteus','uga','anthrax','unitedfactions','anticraft','vietfamily','anv','luckystar','aomc','magicalcraftpe','apcpe','malaysia-empire','applecraftpe','mastercraftpe','aquastar','mc.endergames','arboine','mcpecraft','arcadepe','mcromania','arceuscraft','megacraftolo','argcraft','memo','argencraft','mhf','argmcpe','minearg','argmine','minecraft','argworld','minedox','argworlds','mineplex1','aricrafthost','mines','arimichi','minigamesbymodern158','arkkei510','mlgrepper','arrowcity','moon','arrowshot','msp','arrowshotpe','mvpepvp','artandminecraft','natcraftpe','asdasasaa','nethermine','asherscool','nexusrealms','assassincraft','niggachuandpotato','assassinpvp','ningrat','assassinpvps','nurdawam','assassinsbuild','oliszerver','assassinscraft','omgcraft','ass','opcraft','asuscraft','p121nc3','asvetpvp','paradoxuhc','atlantis-network','pcchin1219','atomicdemonic','pe.greget.craft','atozaaa','pe.survivalc','atozaa','pianomcpe.ralph','atrociousgecko7','pixelcraft','awao','platinumpe','awesomecraft','play.district15','awesomecraft.pe','play.genesys','awesomefactioncraft','play.master','awesomemcpe','play.pinoyep','awesomemine','play.survival','awshumcraft','play.xtreme','awshumcraftpe','pmserver','awsomeeric15','pocketgames','awsome','pokecraft','axartcraftbeta','potatorhd','axefury','prisond','axicsnetwork','prologuepe','b123y','pushed-to-insanity','baconcraft','pvp.pandorianetwork','bacterianetwork','quiniboy','b.a.g.m.t','ramlynserver','bails','rbcrbc','banana','reborncraft','banboss','regcraft','bandit','richardn','bannercraft','roflcraft-pe','barnie','rpa1','batikcraft','sadewanet','batikcraftnet','scc','batikcraftnetwork','seecraft','batikcraftserver','setcraftpe','batikminecraft','shadowninja','batikmine','sickbubblegum','batik-minenetwork','skull','batikmineserver','sky','battermanroleplay','slayrealms','battlecraft','snakecraft','battlecraftpe','sparks','battle','spvp','battlepe','stargames','battlepix','stl','bboy','supercat','bcmcpe','surbug','bcpe','survival.play_ftw','bcte','survivor','bdmcpe','tabarzlandia','beargames','tca-pe','beastagar','teampublic-minigame','beastcraft','test2','beasthub','the2dgamer','beastpe','thehyrimfaxi','bedrock','therebellion','bedwars','thunder','bed.warstr','tonyofbuscus','bedwarstr','tpex','bejglipe','trolololo','benalga','turtlecraft','benjamenytdead','ukitpe','benm8','unchartedcraft','ben','upekitpvp','bestever','vernscraft','bestgaming','vigladios','bestkitpvp','bestserver','luckyworlds','bet2','m14yt','beta1-awsome','magicuhc','beta1','majorcraftpe','beta2','mapasmineropz','betafreebuild','mario','betakingcraft','matacraft','beta.mb','mcbffs','beta','mc.fishking','betaonyxcraft','mcorgins','betatester','mcpemaster','beta.thecloudpvp','mcpetwi','bet','mcsurvivalsquad','bffcraft','medievalproject','bggames','megaoctets','bhmcpe','melban','biedro','meraklioyuncu','bigbang','mexico','bigrock','micholex','bill','millersdraw','billy100','mineboom','billy','minecave','bilo','minecraftpetr','bilopocket','minecrafttestyou','bl3achcraft','mineflex','blackhell','minepe','blackhellxd','mineplex-pe','blackhole','minerprison','blackserver','minetox','blackzerohub','minezoneuk','blackzero','minigm','blackzeronet','miraclecraft','bladepvp','modlikedaboss','bladeraidmc','monstape','blaneplooster2','most','blaze826','mrcrainerfan101arymahi','blaze','multicraft','blazeofcoliseum','mvpefac','blazingnetwork','mystic','bleachpvp','namanh','blitzmc','nb-waterrealm','blitzsg','nethercraft','bln','neversettle','blockbuilders','nexusbeta2','blockcraft','nfg','blockland','nickercraft','blocklife','nightmarewarz','blockly','nikimcpeserver','blockpixel','nitelight','blueab','nsn','bluebloodwoop','nzombiespeplay','bluecraft','ogmmcpe','bluecraftpe','omegaempires','bluepowerhost','omerseval','bluewood','one','blueycraft','onyxoculus','blu','opkitpvp','bmcpecraft','ortakserver','bnmsn','palkiabeta','bob','pantnzserver','bonecraft','pars','bonniegirl_night','paul','boomcraft','peargames','boomcube','pe-evo','boop','pemapmodder','boruto','pe.redstoneclub','bosscraft','peti','bosscraftserver','phcl','bouncer.irc.jojoe77777','pigcraft27','boy_world','pinoyteam','brando','pixelnom','brandon','plasmaball','brantrain','play4funvn','bravocraft','play-cubednetwork','brawl','play-evcrnet','bread_craft','play.gangsterev','breadcraft','playhydra','bread-craft_network','play.ksg','breadcraft.network','play','breadcraftnetwork','play.mineplex','brenner','play.rage','bri92a','play.stl','brinepe','play.thearchonpe','bromo-craft','play.vllvcraft','bromo','play.zombietech','brotherscaft','plus','brotherscraft','pockedit','brothers','pocketdurchgespielt','brsky','pockethub','brutal-factions','pocketredstream','brutalfactions','pokemygamer','bsc','potatocraft','bsp','powerupdev','btgaming','primetech','btg','privategangsters','btm','projectela','btn','prueba','btr','pureretrovernsdaycraft','bubble','pvp3','bubbleship','pvp','budinocraft','pvpsurvival','budinocraftpe','qendrim','budino','radusimihai','buhc','rainboandsno','buildcraftita','raphael','buildcraft','rbc','building-art','rdc','buildingcraft','rebellion','building','red','build','refine4','buildthething','rektcraftftw','buildtime','revengecraft','bukkit','rizki404','bunchofziegs','rocker','buse','romania','bwtest','royal-empire','bxm','ruler','bynedcraft','ryan','c0sm0s','sampvpsuckhere','caio','sbspe','caitlin','scoreland','caitthegreat','sealcraft','cake','serve','caktuspotato','serverpro','caliburger','sfactions','calrizer','shadowluck2029','cameron2','shawygamernetwork','cameroncraft','shopsys','cameronftw','silvercraftpe','cammshost','s_jjsll','canadacraft','skybite','candland','skyhigh','candy','skyslayer','candyz','slayer','captaindpolphins','slimecraft','capuchinx','smkdds','capuchinx','sos','carcraftpvp','spacecraftita','casualgamers','spencergavin','casual','spoilercraft','catcraft','srbija','caveman','starcrafting','caway','starry','cazzoduro','stella','cchong_dada','straightcurlyfries','cc-pe','sunroxsmp','ccpe','supergaming','celestia','supersuv','cfs','surrealcraft','cfvn','survivalcrafts','cfx','survival.romania-server','cgickenderp','survivecraft','ch4vez','sw1','chainsilverfactions','swordcraft','chanon','tacocraft','chaoticpe','tamunoakasi','charmanderpvp','te1','chat','teamnight','checker567432','teamrisk','checkmate','tespek','cheese','testing','cheezycheeze','tests','cherry_kung','thebestever','cherub','thefactor00','chevy4lyfe','thejive','chicken21','theminecraftlegends','chickencraft','thesprout','chickenderp','thinkbluez','chilliyt','tiger','chill','tomplaykids','chillybones','topocraft','chosennetworkpe','towerscraft','chromegladiator','trc','chucho','trkcraft','ciaonecraft','trservidor','cit2','turkis','citycraft','tymcraft','citycrafttr','uhces','city-nc','ulticrafttr','citypvp','ultracraftpe','clanpvp','unicraftpe','clanpvz','universalcraft','clanrys','uprisingpe','clashroyale','veckland','class8g','vernunity','clinkzpe','viewgame','cloudpvp','vinecraft','cloudpvp.red','luckystar','cmt','luckystarvn','cokenation','lucyiparis','coleader','luxcraftpe','colombia','maffiacraft','coloniespe','magicpe','colosseum','magmacraft','colt05','majorcraftpe','combowpe','makisxprogr','comicpe','mammta','compiscraft','maplecraft','conceptsserver','marcolicksbigbooty','conflictfactions','marowan','conflicthub','masterplayers','conflictpsn','matcraft','conflictpvp2','mayo','conflictpvp','mccity','connorcreationsco','mcfinest','controlledprisoncp','mc.gregetcraft-network','cookipe','mci-mpez','coolcraft','mcpecomde','coolcraftpe','mcpe-host','coolcraftt','mcpe','cooldudegaming','mcpeserverpvp','coolkid212','mcreative','coolness','mcscraft','coolpeeps','mcvngaming','coolwarspvp','mcx','coop','megacraft','coronaserver','megalixer','coronaserver','megaservepvp','cosmiccraft','mehrdadd12','cosmic','melbanpe','cosmicpe','meracraft','cosmocraft','mesedpe','coukipe','metalstorm','cownugget','mg1','cowscraft','mianitepocketedition','cpenetwork','microkyrr','crafted','mikilandia','craftedz','miminecraft','craftgames','mineblox','craftify_mc','mineboxbeta','crafting-fantasia','minecapepe','craftingfantasia','minecraftfactionskitpvp','craftingmarko','minecraft-pe4816','craftlandia','minecraftplay','craftmc','minecraftromaniaserver','craft','minedex','craft.pokecraft','minedoxpvp','craftroyal','minegm','craftserver','minekey','craftworld','mineplay','crapexcraft','mineplex','crapexfactions','mineplexpe','crater','minerealmspe','craypexcraft','mineshaftersro','craypexfactions','minetech','crazedcraft','mineverse','crazy99','minezone','crazycraft2.0','minifire','crazycraft','minigames','crazycrafttr','minijuegos','crazycraftyt','minipe','crazype','mkds','create','modern158','createplot','mohaworld','creative','mongcai','creativeserver','monstercraft','creeg','mortalpex','creepcraft','motionness','creepercraft3','mpvp','creepercraft','mrnserver','creeperdna','mtpsurvival','creeperman8311','multiplex','creeper','mustang','creepersurvival','mvpefcts','creepypasta','mysticfacs','cre','mythcraft','crend','nagcraft','criscraft','namthebest','crissw','nature','cristalix','nc-city','criticalpe','nelson','cronver','nether-games','crossfire','net','crossfirepvp','newcraft','crossfireuhc','new.happycraft','crossfirev2','nexusboat','crushnetwork','nexx','crystalcraft','niceduckling13','cs.new','nickercrafthpbt','csonlinepc','nicker-server','ctalbot2004','nightcraft','ctf19','nightraid','cubecraft','niiworld','cubednetwork','nik','cubedplay','ninjago','cubedplays','no1','cubepeforums','nrdwm','cubeplay','nuclearrealms','cubeworld','nzmcpe','cubogamer','oceanic','custom','officialnetwork','cuz','ohan','cyancraft','olympus','cyanuniverse','omegaprison','cyber-craft','omerancraft','cybertest','omgcraft_ita','cyrope','oneklicklp','czechcraft','online','czpe','onyxhotel','dabfaction','op-craft','dafishking','opcraftprison','dafocitos','opprison','dahyun','origingametr','daipl','ostrov','daizy_7','pain','damat-mcpe','palkianetwork','dancemoms','pandaservermcpe','dancemomsxmascity','paradox','dangerouzland','parecraft','danielle','party','dantdmmcpe','paulgamer1023','daproz','pbg','darkclawassassin','pcnet','darkcraftmcpe','pecraft','darkcraft','peepzcraft','darkcyber','pe.fortunecraft','darkfaction','pe.heavennetwork','darkflam3','pemineplex','darkflame','pe-picoworld','darkflamepvp','persian','darkgamespe','pe.survival','darkk','pevarcraft','darklegends','pg-officialserver','darkmatterpe','phoenixmc','dark','pidie-craft','darknessroleplay','pigcraft','darkofpe','piland','darkpvpcraft','pita','darkpvp','pixelgirl_th','darkpvp','pixelwolfpvp','darkreakmspe','pk14','darkrealms','plasma_negwork','darkuhc','play4fun','darkydt','play.blocksonfire','darky','play-cs','darkys','play.cyber','darkysv','play.enderdragongames','darkyy','play.extremecraft','darsh','play.fortunecraft','darwin','play-gcnet','dashable','play-gregetcraft','dashednetwork','play-indocraft','dashoyt','play.knightkingdompe','dawnflash','play.lbsg','dboyiscool','play','dcfactions','play.mcsadewanet','dcpefactions','playmike','dcpe','play-nkrinet','dcraft','play.pvpsurvival','deadly','play-rinetwork','deaf','play.snet','deanarica','play.stronghold','dearborn','playtech','deathcraftmc','play-titaniumpe','deathcraft','play.valleparaiso','deathcraftpe','play.winpecraft','deathdance-craft','play.zedomaster','declan','plexcraft','decommc','plotme','dedjunk','pmmp','deed','pmtools','deedpvp','pocketboxpe','deliveryman','pocketcraft','deltagames2','pocketfac','deltagames','pockethb','deltasmp','pocketmafia','deluxepe','pocketnetwork','delxcraft','pocketvillage','deminecrafterlol','pokemonjpups','demoncraft2','poketrolls','demoncraft','potatobox','demons','potato','demskillz','potionstest','denemexd','ppe','denisromaniaserver','prankuhc','denizgabi','prisoncraft','dennis','prison','derad','pro1111.darksoulcraft','derpy','prohosthing','descendant','projecttest','destroyer31222','prospixel','devardo','ptiforums','devcraft','pubcraft','devcraftpe','purgepvp','deviantmc','pvp1','deviant','pvp5','deviantpvp','pvplithuania','dev-powerup','pvp','devpowerup','pvppon','dgnlserver','pyerx','dhimas','qazrealms','diamonddave','queengals','diamonddemonz','radek160','diamond','ragecraft','diamondnetwork','ragnalol','diamondred','rainbow','diamondscube','randomcraft','diamondshine','ratatatman','diamondsquad','rbc','diamondwarrioz','rbc','diamon','rc-pkt','dianet','reactionpe','dieablo','realmmine','dieablos','rebellionpvp','digitalgameproduction','rebornn','dinamitpe','redwoodterracescreatives','diredawolf','refine2','distantfactions','refine','district15','reg','district17','relish','districtserver','retrovernsday','djkai','revolutionhub','djmcraft','risingfactions','djthejag','roarmc','dkg','roblox1gam3er','dlcoffical','rocketpe','dmdnet','roleplay','dmeg','rommel','dnw','rotzbouf','dobo00','royalftw','dodvip123','rpg','dogehigh','rumbencraft','dogetech','rwc','dolcecraft','saad','dominusuhc','sadewanetwork','domonie','sanecraft','doraemon','sb-server','dorian_hyde92','scalarious','doza','scitalia','doze','scpe','dps','scraft','dpssurvival','sean','dpvp','semihomer','draconicblood','server.beta','dragonc4','serverjuan','dragoncraftmcpe','servertest','dragoncraft','sevastolink','dragoncraftpe','sg-blitzmc','dragoncraft-server','shadowboy','dragonexxpro','shadowmars','dragonlecraft1','shaduuw','dragonlecraft','sheephd','dragon_nogard','shi','dragonpe','showtime','dragonsrule','siege','dreamernetwork','simple','dreamnetwork','sinfulpe','dreamteam','skinmark','dreamville','skuraxmcpe','dreamworld','skyblocksplayer','drixitcraft','skycraft','drkill','skylight','drpe','skyplotorigins','drugster','skywars','druhc','slayerf','dumof','slayhub','durchgespielt','sleepcrafter','dustgame','smallcraft','dxc1','smdnet','dxc','smppe','dylansixx','solartic','earthtomars','soulcraftnetwork','eastpack','spacecraftitalia','eclipseopprison','spamspamtest','ecocraft','speedcraft','ecpe','spiderkid1624334','ecpe','spleef','ecraft','spt-core','editionpvp','squid','eemu2005','srfacs','eemu','stablecraft','efacs','starcraft','efra1in16','starkiller2301','efrain','starsnetwork','efsane','stealthcraft','ehpe','stiffy2000','e-hub','stormxnetwork','ekitpvp','stronghold','ekits','summercraft','electifiedcomplex','superblock','electrichub','supercraftro','electrichubpemc','superkraft','electrichubpe','superrealms','electricnetwork','supremepe','electricraft','surfbuzzy','electrifiedcomplex','survicraft','elementcorepe','survivalcoop','elenacutie','survival','eligiju07','survivalpvp','elitecraft','survivalrpg','elitecraftpe','survivecraft','elitegamezpe','survive','elite','svc','eliteopsurvival','swaggycraft','elitesmp1','swirlpix','elmeri','system','elof','tacklebuilds','elsphetelf','taconetworkpe','elvis03','talisworld','elvis','tar','elyga','tcg_deadshot','em14','te2','emb','teamforward','emcepei','teampublic-games','emecrib','teampublicminigames','emeraldcraft','teenagen','emeraldcraftnetwork','tem','emeraldgames','test1234','emeraldgamespe','teste','emici_gamers','testingserver','eminem','testserver1','emma','tgaming','enchantashiyaterraces','thealtar','enchantedarmyea','thecool','endcraft','thedevnet','enderanimate','thegamers','enderapfelserver','thejack','enderboxie','thekarmalis2','ender-craft','themc','endercraft','theobr','endercraftpe','thesilverhand','enderdragongames','thesuperserverita','_enderdragongirl','thevisionpe','ender-games','thugcraft','endergames','ticzillserver','enderman','titancraftparty','endermcn-bt','tocadaraposa','endermcn','tonton','ender','topkiller','ender_storm','topoland','enderville','totobata','enderworld','townype','enderxtreme','tpg','end','trelixprison','enpotradores','trinityedge','epiccrafttr','trkcrafttr','epickitty','tr-servidor','epicmc','tsmp','epicm','turkeypvp','epicraftpe','turk','epicvernscraft','twentyonepilots','equaliedpe','ucr','equalizedpe','ugp','ersilions','uhc','esiliocraft','ulticraft','esuhc','ultimatecraft','eternalcraft','ultimateserver','eternalcraftpe','ultraserver','eternalpe','underwolrdpvp','eternitycraft','unikcraft','eti92-1c','unitype','eti921c','universalrealms','eti92','uprisingfactions','eu.mineplex','vain','eunion','varcraft','eurogamerie','venomous-network','everlast','vernsday100abos','everlastnet','vichito','everlastpe','vietnamcraft','evilcraft','viewgames','evocrnet','vina','0.11.0-beta','viperzpe','evolusiongc','evolvy-x','luckype','evo','luckystar','evosmp.sb','luckystarvn6','excalibur','luckyworld','exkitpvp','luckywor','exohub','luka','exploprison','luna','exposedpe','luxuryserver','exprison','maceracraft','extra','mafia_factions','extremecraft','magiccraft','extremeindocraft','magicpvp','extremesurvivors','magmacraftgames','eycraft','magma','eytan','majorcraft','ezp','majorcraftpe','fabyan','majorfactions','facescapepvp','makrofighterhd','factionball','malaysiaku','factioncraft','maomc','factioncraftpe','mapaspromcpe','factionking','marblecraft','factionlifelol','marcocraft2','faction','marcosjacker','factionpro','marouane','factionquest','marshmalosodapop','factionraids','masterpixelars','factionserver','mastersofmc','factionskitpvp','matcraft94','factionsmcpe','matixz','factions','mav','factions.play_alpha','mcacademy','factionspro','mc-city','factionspvp','mce404','factions-romania','mcfactions','factionsurvival','mcfinset','factionsurvivalpe','mcgfx','factionuniverse','mcgth','faketheserver','mchubpe','fancy','mcland','fantasia-craft','mcp22e','fantasiacraft','mcpecrafter','fantasia','mcpecraft','fantastia','mcpemaster21','fantastic-craft','mcpe','fantastic','mcpepiruleta','fantasygaming','mcpe-server','fantasyita','mcpetools','fantasyitape','mcpe.vn','fantasyit','mcrid-play','fantasy','mc.sby-craft','farros12','mcsnet','fartedfaction','mctb-server','farted','mcvpvp','fartedpe','mcw10','fatalpe','medieval','faxon','meepmop','fazerain','megacraftolino','fbp74games','megagoldrealms','fbp74','mega','fcavn','megapvp','febbos','megaserver','felipeplayzyt','mehmetcraft','ffg','meinneger','ffs','melbanpc','ffsuhc','melvin','filipev','menacecraft','finalkingscraft','meraki','fireball','merry','fireblades','mesrocz','firecity','messamine','firecityz','mexican.crafting','firecrafter','mexiplex','firecrafterpe','mgth','firecraft','mianitepe','firecraftpe','michael','firegamer','mickey','firegamesbr','micro','firegames','mike','firegamest','millenium','fireland','mimecub','fire','mincraft503','firerealms','minebeach','firsttry','mineboatpe','fishkingmc','minebote','fishking','minecade','five503','minecape','fix_mix','minecart','flame_guardian','minecity','flamezcraft','minecraftfactions','flamzpvpfac','minecraftonline','flamzpvpfaction','minecraftpenl','flamzpvpfaction','minecraftpeturkey','flamzpvpfactions','minecraft.roleplay','flamzteampvpfactions','minecraftromania','flarepe','minecraftsurvivalpro','flateface','minedaav','flatland','minedog','flatlandpe','minedoxprison','floatcraft','minefishmc','fmlvietnam','minegaming','fnafcraft','minehex','fnaps','minekeykitspvp','fnfy','mine','fnfy','mineplayers','fnfysv','mineplayz','focus','mineplexconcept','forevernation','mineplex','formeandrose','mineplex.pe','fortunecraft','mineplexpe','foxmerry','minerealms','fphigh','miner','framed101','minerrev','freakcraft','mineslashpe','freakgames','minestudy','freebuild1','minetime','freebuild','mineturk','freecraft','minewar','freedomhighschool','minezonemcpe','freedomhs','minezonepe','freedommcpe','minicraft','freedom','minigamehub','freeschool','minigames','frenks_channel_','minigamespe','freshgaming','minigodz','friendlcraft','mini','friendlycraft','mining','friends','min','frostbite','mirmircow','frostblue','mlgproscott','frost-faction','modedwarfare','frostfaction','modern','frostfaction','modoland','frostfactions','mohmadgamer15','frostfactionspe','momo','frostfactionz','monsta','frostf','monstercraft','frosthighnetwork','monster','frostland','moonsun','frostpe','mortib20','frostpvp','motion','frostwiregaming','mouad','frostyfactions','mppserv','frozenrealmsmc','mr2007creeper','fsm-vn','mrnoob98','ftb','mrsessions','fuca','mtch','fuckk','muiehenning','fuckyouguys','multiparkour','funcraft','mundomcpe','funcraft','mustangcraft','funlandia','mu-vn','funland','mvpefct','fun','mvpe','funpocketmine','mycraft','furiouscraft','mysticfactions','furious','mysvpt','fury','mzcpe','futurecraft','n0i','gabboworld','namanh123','gabi21','nammines','gabiboy21','naruto97','gabiboy','nateservers','galactic','nature','galacticuniverse','ncbh-craft','galactynet','nc-craft','galaxycraft','neck','galaxy','netcraftpe','gallifrey','nethercube1','game1.play','netheria','game-craft','nethernetwork','gamecube','netnetz','gameexperten_server','neversettle','gameexpertenserver','new.happycraft','game','new.happycraft','game_pedia','newhub','game-pedia','nexusbeta','gamepedia','nexus','gamercraft','nexusspawnalpha','gamer','nfcorp','gamers12','nibblefactionz','games','nickercraft1st','games-nether','nickercraft-city','gamesse','nicker-craft','gamingcrafterz','nickercraft-server','gamingcraft','niezamworld','gamingcraftpe','nigga','gamingcrafttr','nightingale','gamingirl','night','gamingtimexd','nightsmp','gapplecraft-factions','nihalcraftpe','garbearcraft','nikimcpe','gazefactions','nikkocraft','gazemc','ninerscraft','gcpe','ninjacraftpl','gcraft','nitacraft','gcspe','nkrinet','geee','noexcuzes','geek','noteblock','geek','nsn','geilocraft.party.de','nuclearfaction','geilocraft-youtuber','nuifan','gelomark25','nycuro','generation','nzombiespe','geneti-craft','oceancraft','geneticraft','ocelotcraft','geneti-high','official','germanycraft','officialsam203','getdirty','ogm','getrekt','olimpocraftmcpe1','ggo','olympusgods','ggtx','omari','ggtxpe','omegaprison22','ghast','omegapvp','ghastnation','omegaworld','ghastnationpe','omer','giapponesecraft','omgcraftita1','gielen','omgcraftita','giochiamo2','oneandonlyblue','giovannipower','oneloc','gkaz','oneup','global','onyxcraft','global_minecraft','onyxcrafttr','global-minecraft','onyxmc','global-mncrft','ooo','gloriousminecraftpe','opcraft','glossblack','opcraftprision','glsg','opkiller','glsg-mpez','op_','gobelincraft','orangepvp','godfaction','origingame','god','orpe','godz1','oscar287','godzcraft','otthon','godzgames','p2xa1','godz','paintboll','godzpvp','palkiagames','godzpvps','palkiaserver','golden.apple','pandalover','goldenbros','pandorianetwork','goldencraft','papa','goldencreate','paradox_uhc','golden','paradoxuhcpe','golden-realms','parkourchallenge','goldiumpe','partycraft','goldplaygames','partynation','golsphere','pastel','goodserver','paulgamercraft','goodwork','paulvernhardt','grade6gk2016','pcb','granados133','pcchin','gravelordservants','peaceoutnationyt','gravityfrontier','pe.craftlandia','greywood','pe.d12reborn','grim4vote','pedro','grimcraftaz','pe-evolvy','grim_craft','pe.evo','grimcraft','pe.greget-craft','grimkiller','pe.gregetcraft-network','grim','pe.lucky','grim.vote','pe.mineplex','grim.vote','pem','ground','penprison','gsphere','pe.play-vol','gta5','pe.refine','gta','pe.sc-indo','gugubr','pe.survivalcraft','gulock01','peter_world','gummynetwork','pe.varcraft','gustabr','pe.wol','gustavo1','pe.y11craft','gustavobr','pgpe','guys','phoenixcraft','hackervietnamese','pianomcpe','hackink','piano.real.server','hackinkyt','pigcraft1','hades','pigcraftita','hahahahah','pigcraftpe','haiku','pigluigipe','hakkkuh','pinoyako','halbparty','piratecrew','halbpartysrv','pixelarmy','hamson2','pixelgirl','hamsonmc','pixelhive','hamson','pixelparkour','hamsonpe','pixicraftpe','handiman','pk13','hans','pkpvp','happycraft','plasmacraft','happycreative','plasmape','happyfamily','play4fun','happyfuncraft','play4fun','happype','play-accraft','happypocketedition','play.carplex','happyunicornland','playcraft','hardcore','play.cs','hardguard','play.cybercraft','hardpvp','playcy','hargun7kamcord','play.district15.new','harmony','player01','harraya','play.evcrnet','harsh','play.extremeindocraft','hartawan','play-fortunecraft','hasanefefb','play.ftwzone','hassbach','play-garuda','haulp','play-genesys','haup','play.goldenrealms','hcraft','play-herocraft','hdg','play.ignl','hearthy','play.indoskuat','hellocraft','play.knightkingdom','hello','play-ksg','hentai','play.lavabucketpe','hermitcraftpe','playmafia','herobrine','play.mazerunner','herocraft','play','herocra','play.mcperp','heroes','play.meracraft','heroespe','play-mhf','hero','play.minedoxpvp','hexfactions','play.mttpe','hexiacraft','play.obsidianisles','heyimjanftw','play.purgepvp','hhpvp','play-pw','hhpvpnetwork','play-rinet','hhpvppe','play.sadewamine','hiep.bm','play.sliceprision','hifels','play.starcraft','high.network','play.stormpe','hii','play-summonwars','hillcraft','playsw','hippvp','play.thearchon','hi_spanish','play-thearcon','hivemine','play.titaniumpe','hknbnm','playuhc','hlbuild','play-varcraft','hlpvp','play.wcvn','hlsv','play-wlc','holacraft','play.yeetcraftpe','hola','play.zombiecraft','holycube','pl.breadcraft','holycubepe','plexcraftpe','holycubepes1','plotit','homeofpvp','plots','hoppp','plya.rinetwork','horizoncraft','pmplay4fun','horo','pms','horust','pockecraft','hosecraft','pocketbox','host.ciep21','pocketcrafter','host.imperios','pocketcraft','hosting','pocketcraftpe','host','pocketempire','host.slicemcpe9','pocketgamesfac','host.sliceprision2','pocketgamespvp','host.sliceprision','pockethub','hostwolfhostwolf','pocketlife','host.xlymcpe','pocketmasters','hpemc','pocket-mine','hpe','pocketpixel','hpocketedition','pocketserver','hpvp','poisoncraft','htw.soup','pokefactions','hubcraft','pokemon','hucau','poketroll','hueworld','polarcraft','hulkdoesgaming','porcodio','humanhore','potatocakt','hungerbox','potatocrate','hungergames','potatopvp','hydra','potatorhd','hydranetwork','powerstrike','hypecraftpe','powup','hypercraft','p.pocketempire','hypernet','prankpvp','hypertic3','primefusionpe','hypertic','principial','hypixel','prisondelux','hyptic','prisonmcpe','hypticpvp','prison.pocketempire','hysg','prixpe','hytr','pro1111','ibitserver','progius','ibn','prohosting','ibnpro','projectpokepe','ibradleys','prokitpv','iceblade','proserver','icebladepvp','prueba24','icebreak','pspvping','icecraftmc','pti-hub','icecraftpe','pt-network','icy','punchappsgames','idenesiaku','puresurvival','idn','purple','idolcraft','pvbattle','idolfr','pvp2','idrisouane','pvp4','iepuras','pvpandgames','iflow','pvpgodz','ignet','pvpmaster','ignlbeta','pvp','ihappyxjoyce','pvp','ihubnet','pvppers','ihubpvp','pvp-survivaland','iiikutiii','pvpwkit','ijoyce_','pyrex','ikitpvp','pyxelgamespe','ilcyber','qazrealms','ilifemcpe','qoo','ilife','queensnow1924','ilifepe','qwertx','ilovemc','radictesters','ilovemcpe','ragecharge','ilovenn','ragehighpe','imc','ragezonepe','immortalcraftfactions','rails','immortalcraft','rainbowcraft','immortal','rainbowprison','imperialpe','rampage','in-adventure','randomcraftpe','incurrent','rasim','incurrentpe','razal','ind-network','rbc','indocity','rbc','indocrafter','rbc','indocraft','rbc','indoi','rcpe','indo','rdcfac','indoneocraft','reactionfacs','indonesia','ready5','indonesiancraft','realm','indonesian','rebellion','indonetworkgame','rebellion-pvp','indo-network','rebellionpvp-us','indonetworks','rebornfactions','indoskuat','redbbow','infernope','redstoneclub','infinite-kitpvp','redwoodterraces','infinite','refine1','infinityblock','refine3','infinitycraftdxd','refine-dlc','infinity_craft','refinetotoso','infinitycraft','register','infinitygamers','rekk','infinity','rektpe','infinitype','renee','infinitypvp','republikofminecraftyc','infnet','retrovernte','info','rev','inicraft','rezmect','in-pocket','rise','inpocket','riyansaputra','insanenetwerk2','rj0495','insanenetwerk','roarpe','insanenetwork','robin','insanenetwork','roboticraft','insanenetwork.mp','rocketminerspe','insanenetwork.v2.0','rocketsbloc','insanenetwork.v2','rohan','instantsnetwork','rollercoaster','intensepvp','romaniasmechera','ipe','rose','irancraft','rotraining','ircbouncer','rowisnap','ireallylikepie','royal_ftw','ironcraft','royalpe','ironcraftpe','rpg.lc','ironhive','rubby','ironsidehub','rumbencraft','irpe','rumcraft','islandsurvivor','rwc1','isro','rwe','italiccraft','ryguy','itanetwork','sadewamine','itaspacecraft','sadewanetsrv','it_e','saitek','itsfunttoplay','sandcraft','itsriolu','sanquintin','itzyourgirlashh','sbsb4sh','iujkeku','sbs','ivandroiid','sbtv','ivan','scbb','ivanoski','schneider-craft','ivanserver','sc.lc','ivoievods','scorpia','izzat','scpe','izzy','scraft','j331yelectro218','screeper_hdg','j331yelectro21','sealer','jaccraft','sebasblack','jacielovejoy','semi_girl','jackins','senpiegod','jackinsnetwork','server1','jack','serverbeta','jacknetwork','serverhyeok','jacobadam27','server','jacraft','serverro','jailzero','setcraft','jakeserver','setcraftp','jakeycraft','sexcraft','jakkandmaxdistructogaming','sg101.dms','jakkandmaxgaming','sgc','jakobs','shadercraft','jamhs','shadowcraftsb','jansen','shadowmars','japandaisuki','shadow','jasal','shadowsnowstorm','jasonwynn10','shapedbuilding','javacraft','sheep_hd','jazz','sheep','jbg_craft','shidz','jbg-craft','shockwave','jbgcraft','shoupvp','jcarter','shreklikesonions','jcraft','sidit2','jebiamyt','silentpe','jebiga','silverworld','jellyserver','simplyvanilla','jermanozcraft','sinful','jessie_101','sirtigerboy','jetz','skincontest','jfish2000','skullcraft','jfish','skully','jgamer3353','skybh','jgj_kitpvp','skyblock','jgj','skyblocktr','jgj_mg','skycorn','jgj_psn','skyfrostcraft','jivecraft','skylife','jmms','sky','jockeycraft','skynote','joelcedrascool','skypvppe','joelserver1','skywarsit','joemckellar2014','skywars','joeycraft','slander','johan','slayerf','johanrd','slayer','johnbulliner','slaypvp','johnnydays','slcraft','joinnow','slicewars','jojoe77777','slimeelite','jojoe','smanisda','jollys','smashplay2013','jombang-craft','smeltpe','jordan','smp','jose','snail','jowseyserver','sobcraftmcpe','jscrafttemp','sorencraft','jsmith','soulcraft','juanfromthesouth','soulcraftpe','juan','sp1','julmemfel','spacecraftitaly','jungsun','spacecraft','junkworld','sparkscraft','just4fun','sparky','justforfun','spe','justin','spid3rnation','just-play','spita','justpvp','sp-lbsg','jvi','splittcraft','jwhitecraft','sp-pk','jwo','sptcore','k98','squad.rossome','kaicraft','squidstin','kaikai','srfac','kaipowerup','sriscraft','kairus','ss-smp','kakka','stackhouse','kamilga9','starcraftmc','kanomania','starcraftpe','katmc','stargamingnetwork','kattfur','star','kattfur','starserver','katya','starterraces','kayaserver','stcraft','kble','stealthryche','kdc-faction','stevecraft','kdc-factions','stiffy','kdc.factions','stormpe','kdotdev','story','keanugames1111','stromnet','keepcalmlife','sukitpvp','kejucraft','sumar','kentikzlo','summoncraft','kevin','supe','kewl','superbro12','kforkolin','supercraft','kgnetwork','supergamers','kgpe-kitpvp','superhub','kgpe','superlg','killercraft','supermegacraftolo','killer_frost','superserver','killzone33','supreme','kingame','surabaya-craft','kingcraft','surfbuzz','kingcraftpe','surgepvp','kingdomgames','surrealsmp','kingdomganie','survi','kingdomganieserver','survivalassault','kingdompe','survivalcraft','kingdomscraft','survivall','kingerfaction','survivalpe','kingerfaction','survivalpocket','kingfactions','survivalromania','kingoflife','survivalro','kingscraft','survival.takabrycheri','kingscraftpe','survivecrafr','kingscraftpvp','survivecraft','kinguhc','survivecraft','kinsmencraft','survivorcraft','kirape','svbm','kirito','svile','kitattack','sw2','kitdown','swagpvpe','kit','swirl','kit','swn','kitpe','swpe','kitpe','t1091','kitpropvp','tabarzland','kitpvp','taco-craft1','kitpvp','tacocraftpe','kitpvp','taisempai','kiwicraft','taliscraft','kiwi','talisworlds','kju','tancraft','kkdroidpe','tca-craft','knightkingdom','tcc','knightsolaire','tcp_batman','knocksg','te1-merakinetwork','knox','teambloxheadsleef','korado','teamcraft','kris','team-herobrine-test','krushcraftpe','teampublicfc','krushpesurvival','teampublic.mini1','krustycraft','teampublic-minigames','kryptonitecraft','teampublicprison','ksg','teamvol','ksg-sg1','teentitans','kubixqcraft','tekserver','kydzfactions','templex','kyruemserver','test101','lachydachy3214','test1','lagrima','testcraft','lavaarmy2','testing1','lavabucketfactions','testingserver1','lavabucketmcpe','test','lavabucket','test','lavabucketpe','testserver','lavabucketsurvival','tfsfactions','lavacraft','thatstrangekid','lb-lobby','thealex','lblood','thebeastatthis','lbsg','thebest','lbsh','thecrew','lbss','thecubedpe','lb-sw','thedevnetwork','lcalbi','thefifth','lcmcpe','theglobal','lcraftv2','theindomc','ldxcraft','thejivehub','ldx','thekarmali','leaf','thekingcraft','leben','themccraft','lechugapvp','the','leeeepvp','theo-br','leeepvp','theo','leek','therighttree','leepvp','thesky','leer','thesuperserverita1','leet.cc','thesuperserver','legacypvp','thevisionmg','legacyuhc','thevoidnetwork','legendaryelites','thronepvp','legendbeast','thundercraft','legend-craft','thundersmp','legendcraft','tigermc','legendcraftpe','timelord','legendelitecraft','titaniumprison','legendmc','tmcecraft2','legend','tog','legend.pvp','tomplay','legendpvp','tony','legendspe','toontownreborn','legen','top','legionfac','topoland2bitches','legionfactions','topoysubs','legion-pe','toreoncl','legionpe','tower','legionpvp','towers','legoboy0215','toxic-network','legoboy','tpexz','legocraft','transfercraft','legomine','treblecrxft','legospleef','trexhost','lel2','trinitycraft','lelefera2','trinitypvp','lelefera','trkcraftt','lel','trolcraft','lelnetwork','trombonecat459','lemon','tr-servidor','leons','truth','leroy','tsundere_world','letsplaymcpe','turkcraft','letsplay','turki','lgb','turkiye','lgc','turkpvp','libertycraft','turtle','lichcraftpe','twokinds','lifeboat-sg','ucraft','life','ufob2','lifemine','ugm','lifepixle','uhcb','lightningminers','uhchub','lil','ukitpe','limeymc','ulimately','linkcraft','ulticraftt','linkuhc','ultimatecraft','lionblood','ultimatecraftpe','littleinjection','ultimatemc','litva','ultracraft','lksvn','ultrahc','lmaoidk','ultraturk','lobby','undercot','lobbyw','unicornland','lobogris','unikcraft','localhost','uniteddevs','lolcraft','unitedpe','lolerswinlife','unitypvp','lolerswin','universalpvp','loll','unpe','lol','uprisingfac','lol','uprising','lolol','us.mineplex','loloma','valcraft','looot','van.sw','lordofmaiden','vcbeta','lorecraft','venom','lore','venompvp','lospambisitos0111','vernscraft-network','lostteam','vernsday100','lotacraft','veziklsurvival','louismartin','vicraft','lovecraft','viet','lovercitylife','vietnamese','lp2016','view-games','lpmitmortib20','views.games','lshk','vigycraft','lsvn','vincentw99','luckycraft','vinw99','luckymc','virtualpe','lucky'];
    $scope.warningShown = false;
    //

    // Create new Record
    $scope.create = function (isValid, force) {
      $scope.error = null;
      //FIXME ^ same
      if(!$scope.warningShown && $scope.usedNames.indexOf(this.name) > -1){
        $scope.warningShown = true;
      }
      //
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'recordForm');

        return false;
      }

      // Create new Record object
      var record = new Records({
        name: this.name,
        content: this.content,
        recordType: this.recordType
      });

      // Redirect after save
      record.$save(function (response) {
        $location.path('records/' + response._id);

        // Clear form fields
        $scope.title = '';
        $scope.content = '';
      }, function (errorResponse) {
        $scope.error = errorResponse.data.message;
      });
    };

    // Remove existing Record
    $scope.remove = function (record) {
      if (record) {
        record.$remove();

        for (var i in $scope.records) {
          if ($scope.records[i] === record) {
            $scope.records.splice(i, 1);
          }
        }
      } else {
        $scope.record.$remove(function () {
          $location.path('records');
        });
      }
    };

    // Update existing Record
    $scope.update = function (isValid) {
      $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'recordForm');

        return false;
      }

      var record = $scope.record;

      record.$update(function () {
        $location.path('records/' + record._id);
      }, function (errorResponse) {
        $scope.error = errorResponse.data.message;
      });
    };

    $scope.mine = function () {
      Records.mine(function (data) {
        $scope.records = data;
        $scope.buildPager();
      });
    };

    // Find a list of Records
    $scope.find = function () {
      Records.query(function (data) {
        $scope.records = data;
        $scope.buildPager();
      });
    };
    $scope.buildPager = function () {
      $scope.pagedItems = [];
      $scope.itemsPerPage = 15;
      $scope.currentPage = 1;
      $scope.figureOutItemsToDisplay();
    };

    $scope.figureOutItemsToDisplay = function () {
      $scope.filteredItems = $filter('filter')($scope.records, {
        $: $scope.search
      });
      $scope.filterLength = $scope.filteredItems.length;
      var begin = (($scope.currentPage - 1) * $scope.itemsPerPage);
      var end = begin + $scope.itemsPerPage;
      $scope.pagedItems = $scope.filteredItems.slice(begin, end);
    };

    $scope.pageChanged = function () {
      $scope.figureOutItemsToDisplay();
    };

    // Find existing Record
    $scope.findOne = function () {
      $scope.record = Records.get({
        recordId: $stateParams.recordId
      });
    };
  }
]);

'use strict';

//Records service used for communicating with the records REST endpoints
angular.module('records').factory('Records', ['$resource',
  function ($resource) {
    return $resource('api/records/:recordId', {
      recordId: '@_id'
    }, {
      update: {
        method: 'PUT'
      },
      mine: {
        isArray: true,
        method: 'GET',
        url: 'api/records/mine'
      }
    });
  }
]);

'use strict';

// Configuring the Records module
angular.module('users.admin').run(['Menus',
  function (Menus) {
    Menus.addSubMenuItem('topbar', 'admin', {
      title: 'Manage Users',
      state: 'admin.users'
    });
  }
]);

'use strict';

// Setting up route
angular.module('users.admin.routes').config(['$stateProvider',
  function ($stateProvider) {
    $stateProvider
      .state('admin.users', {
        url: '/users',
        templateUrl: 'modules/users/client/views/admin/list-users.client.view.html',
        controller: 'UserListController'
      })
      .state('admin.user', {
        url: '/users/:userId',
        templateUrl: 'modules/users/client/views/admin/view-user.client.view.html',
        controller: 'UserController',
        resolve: {
          userResolve: ['$stateParams', 'Admin', function ($stateParams, Admin) {
            return Admin.get({
              userId: $stateParams.userId
            });
          }]
        }
      })
      .state('admin.user-edit', {
        url: '/users/:userId/edit',
        templateUrl: 'modules/users/client/views/admin/edit-user.client.view.html',
        controller: 'UserController',
        resolve: {
          userResolve: ['$stateParams', 'Admin', function ($stateParams, Admin) {
            return Admin.get({
              userId: $stateParams.userId
            });
          }]
        }
      });
  }
]);

'use strict';

// Config HTTP Error Handling
angular.module('users').config(['$httpProvider',
  function ($httpProvider) {
    // Set the httpProvider "not authorized" interceptor
    $httpProvider.interceptors.push(['$q', '$location', 'Authentication',
      function ($q, $location, Authentication) {
        return {
          responseError: function (rejection) {
            switch (rejection.status) {
              case 401:
                // Deauthenticate the global user
                Authentication.user = null;

                // Redirect to signin page
                $location.path('signin');
                break;
              case 403:
                // Add unauthorized behaviour
                break;
            }

            return $q.reject(rejection);
          }
        };
      }
    ]);
  }
]);

'use strict';

// Setting up route
angular.module('users').config(['$stateProvider',
  function ($stateProvider) {
    // Users state routing
    $stateProvider
      .state('settings', {
        abstract: true,
        url: '/settings',
        templateUrl: 'modules/users/client/views/settings/settings.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('settings.profile', {
        url: '/profile',
        templateUrl: 'modules/users/client/views/settings/edit-profile.client.view.html'
      })
      .state('settings.password', {
        url: '/password',
        templateUrl: 'modules/users/client/views/settings/change-password.client.view.html'
      })
      .state('settings.accounts', {
        url: '/accounts',
        templateUrl: 'modules/users/client/views/settings/manage-social-accounts.client.view.html'
      })
      .state('settings.picture', {
        url: '/picture',
        templateUrl: 'modules/users/client/views/settings/change-profile-picture.client.view.html'
      })
      .state('authentication', {
        abstract: true,
        url: '/authentication',
        templateUrl: 'modules/users/client/views/authentication/authentication.client.view.html'
      })
      .state('authentication.signup', {
        url: '/signup',
        templateUrl: 'modules/users/client/views/authentication/signup.client.view.html'
      })
      .state('authentication.signin', {
        url: '/signin?err',
        templateUrl: 'modules/users/client/views/authentication/signin.client.view.html'
      })
      .state('password', {
        abstract: true,
        url: '/password',
        template: '<ui-view/>'
      })
      .state('password.forgot', {
        url: '/forgot',
        templateUrl: 'modules/users/client/views/password/forgot-password.client.view.html'
      })
      .state('password.reset', {
        abstract: true,
        url: '/reset',
        template: '<ui-view/>'
      })
      .state('password.reset.invalid', {
        url: '/invalid',
        templateUrl: 'modules/users/client/views/password/reset-password-invalid.client.view.html'
      })
      .state('password.reset.success', {
        url: '/success',
        templateUrl: 'modules/users/client/views/password/reset-password-success.client.view.html'
      })
      .state('password.reset.form', {
        url: '/:token',
        templateUrl: 'modules/users/client/views/password/reset-password.client.view.html'
      });
  }
]);

'use strict';

angular.module('users.admin').controller('UserListController', ['$scope', '$filter', 'Admin',
  function ($scope, $filter, Admin) {
    Admin.query(function (data) {
      $scope.users = data;
      $scope.buildPager();
    });

    $scope.buildPager = function () {
      $scope.pagedItems = [];
      $scope.itemsPerPage = 15;
      $scope.currentPage = 1;
      $scope.figureOutItemsToDisplay();
    };

    $scope.figureOutItemsToDisplay = function () {
      $scope.filteredItems = $filter('filter')($scope.users, {
        $: $scope.search
      });
      $scope.filterLength = $scope.filteredItems.length;
      var begin = (($scope.currentPage - 1) * $scope.itemsPerPage);
      var end = begin + $scope.itemsPerPage;
      $scope.pagedItems = $scope.filteredItems.slice(begin, end);
    };

    $scope.pageChanged = function () {
      $scope.figureOutItemsToDisplay();
    };
  }
]);

'use strict';

angular.module('users.admin').controller('UserController', ['$scope', '$state', 'Authentication', 'userResolve',
  function ($scope, $state, Authentication, userResolve) {
    $scope.authentication = Authentication;
    $scope.user = userResolve;

    $scope.remove = function (user) {
      if (confirm('Are you sure you want to delete this user?')) {
        if (user) {
          user.$remove();

          $scope.users.splice($scope.users.indexOf(user), 1);
        } else {
          $scope.user.$remove(function () {
            $state.go('admin.users');
          });
        }
      }
    };

    $scope.update = function (isValid) {
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');

        return false;
      }

      var user = $scope.user;

      user.$update(function () {
        $state.go('admin.user', {
          userId: user._id
        });
      }, function (errorResponse) {
        $scope.error = errorResponse.data.message;
      });
    };
  }
]);

'use strict';

angular.module('users').controller('AuthenticationController', ['$scope', '$state', '$http', '$location', '$window', 'Authentication', 'PasswordValidator',
  function ($scope, $state, $http, $location, $window, Authentication, PasswordValidator) {
    $scope.authentication = Authentication;
    $scope.popoverMsg = PasswordValidator.getPopoverMsg();

    // Get an eventual error defined in the URL query string:
    $scope.error = $location.search().err;

    // If user is signed in then redirect back home
    if ($scope.authentication.user) {
      $location.path('/');
    }

    $scope.signup = function (isValid) {
      $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');

        return false;
      }

      $http.post('/api/auth/signup', $scope.credentials).success(function (response) {
        // If successful we assign the response to the global user model
        $scope.authentication.user = response;

        // And redirect to the previous or home page
        $state.go($state.previous.state.name || 'home', $state.previous.params);
      }).error(function (response) {
        $scope.error = response.message;
      });
    };

    $scope.signin = function (isValid) {
      $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');

        return false;
      }

      $http.post('/api/auth/signin', $scope.credentials).success(function (response) {
        // If successful we assign the response to the global user model
        $scope.authentication.user = response;

        // And redirect to the previous or home page
        $state.go($state.previous.state.name || 'home', $state.previous.params);
      }).error(function (response) {
        $scope.error = response.message;
      });
    };

    // OAuth provider request
    $scope.callOauthProvider = function (url) {
      if ($state.previous && $state.previous.href) {
        url += '?redirect_to=' + encodeURIComponent($state.previous.href);
      }

      // Effectively call OAuth authentication route:
      $window.location.href = url;
    };
  }
]);

'use strict';

angular.module('users').controller('PasswordController', ['$scope', '$stateParams', '$http', '$location', 'Authentication', 'PasswordValidator',
  function ($scope, $stateParams, $http, $location, Authentication, PasswordValidator) {
    $scope.authentication = Authentication;
    $scope.popoverMsg = PasswordValidator.getPopoverMsg();

    //If user is signed in then redirect back home
    if ($scope.authentication.user) {
      $location.path('/');
    }

    // Submit forgotten password account id
    $scope.askForPasswordReset = function (isValid) {
      $scope.success = $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'forgotPasswordForm');

        return false;
      }

      $http.post('/api/auth/forgot', $scope.credentials).success(function (response) {
        // Show user success message and clear form
        $scope.credentials = null;
        $scope.success = response.message;

      }).error(function (response) {
        // Show user error message and clear form
        $scope.credentials = null;
        $scope.error = response.message;
      });
    };

    // Change user password
    $scope.resetUserPassword = function (isValid) {
      $scope.success = $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'resetPasswordForm');

        return false;
      }

      $http.post('/api/auth/reset/' + $stateParams.token, $scope.passwordDetails).success(function (response) {
        // If successful show success message and clear form
        $scope.passwordDetails = null;

        // Attach user profile
        Authentication.user = response;

        // And redirect to the index page
        $location.path('/password/reset/success');
      }).error(function (response) {
        $scope.error = response.message;
      });
    };
  }
]);

'use strict';

angular.module('users').controller('ChangePasswordController', ['$scope', '$http', 'Authentication', 'PasswordValidator',
  function ($scope, $http, Authentication, PasswordValidator) {
    $scope.user = Authentication.user;
    $scope.popoverMsg = PasswordValidator.getPopoverMsg();

    // Change user password
    $scope.changeUserPassword = function (isValid) {
      $scope.success = $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'passwordForm');

        return false;
      }

      $http.post('/api/users/password', $scope.passwordDetails).success(function (response) {
        // If successful show success message and clear form
        $scope.$broadcast('show-errors-reset', 'passwordForm');
        $scope.success = true;
        $scope.passwordDetails = null;
      }).error(function (response) {
        $scope.error = response.message;
      });
    };
  }
]);

'use strict';

angular.module('users').controller('ChangeProfilePictureController', ['$scope', '$timeout', '$window', 'Authentication', 'FileUploader',
  function ($scope, $timeout, $window, Authentication, FileUploader) {
    $scope.user = Authentication.user;
    $scope.imageURL = $scope.user.profileImageURL;

    // Create file uploader instance
    $scope.uploader = new FileUploader({
      url: 'api/users/picture',
      alias: 'newProfilePicture'
    });

    // Set file uploader image filter
    $scope.uploader.filters.push({
      name: 'imageFilter',
      fn: function (item, options) {
        var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
        return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
      }
    });

    // Called after the user selected a new picture file
    $scope.uploader.onAfterAddingFile = function (fileItem) {
      if ($window.FileReader) {
        var fileReader = new FileReader();
        fileReader.readAsDataURL(fileItem._file);

        fileReader.onload = function (fileReaderEvent) {
          $timeout(function () {
            $scope.imageURL = fileReaderEvent.target.result;
          }, 0);
        };
      }
    };

    // Called after the user has successfully uploaded a new picture
    $scope.uploader.onSuccessItem = function (fileItem, response, status, headers) {
      // Show success message
      $scope.success = true;

      // Populate user object
      $scope.user = Authentication.user = response;

      // Clear upload buttons
      $scope.cancelUpload();
    };

    // Called after the user has failed to uploaded a new picture
    $scope.uploader.onErrorItem = function (fileItem, response, status, headers) {
      // Clear upload buttons
      $scope.cancelUpload();

      // Show error message
      $scope.error = response.message;
    };

    // Change user profile picture
    $scope.uploadProfilePicture = function () {
      // Clear messages
      $scope.success = $scope.error = null;

      // Start upload
      $scope.uploader.uploadAll();
    };

    // Cancel the upload process
    $scope.cancelUpload = function () {
      $scope.uploader.clearQueue();
      $scope.imageURL = $scope.user.profileImageURL;
    };
  }
]);

'use strict';

angular.module('users').controller('EditProfileController', ['$scope', '$http', '$location', 'Users', 'Authentication',
  function ($scope, $http, $location, Users, Authentication) {
    $scope.user = Authentication.user;

    // Update a user profile
    $scope.updateUserProfile = function (isValid) {
      $scope.success = $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');

        return false;
      }

      var user = new Users($scope.user);

      user.$update(function (response) {
        $scope.$broadcast('show-errors-reset', 'userForm');

        $scope.success = true;
        Authentication.user = response;
      }, function (response) {
        $scope.error = response.data.message;
      });
    };
  }
]);

'use strict';

angular.module('users').controller('SocialAccountsController', ['$scope', '$http', 'Authentication',
  function ($scope, $http, Authentication) {
    $scope.user = Authentication.user;

    // Check if there are additional accounts
    $scope.hasConnectedAdditionalSocialAccounts = function (provider) {
      for (var i in $scope.user.additionalProvidersData) {
        return true;
      }

      return false;
    };

    // Check if provider is already in use with current user
    $scope.isConnectedSocialAccount = function (provider) {
      return $scope.user.provider === provider || ($scope.user.additionalProvidersData && $scope.user.additionalProvidersData[provider]);
    };

    // Remove a user social account
    $scope.removeUserSocialAccount = function (provider) {
      $scope.success = $scope.error = null;

      $http.delete('/api/users/accounts', {
        params: {
          provider: provider
        }
      }).success(function (response) {
        // If successful show success message and clear form
        $scope.success = true;
        $scope.user = Authentication.user = response;
      }).error(function (response) {
        $scope.error = response.message;
      });
    };
  }
]);

'use strict';

angular.module('users').controller('SettingsController', ['$scope', 'Authentication',
  function ($scope, Authentication) {
    $scope.user = Authentication.user;
  }
]);

'use strict';

angular.module('users')
  .directive('passwordValidator', ['PasswordValidator', function(PasswordValidator) {
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
        ngModel.$validators.requirements = function (password) {
          var status = true;
          if (password) {
            var result = PasswordValidator.getResult(password);
            var requirementsIdx = 0;

            // Requirements Meter - visual indicator for users
            var requirementsMeter = [
              { color: 'danger', progress: '20' },
              { color: 'warning', progress: '40' },
              { color: 'info', progress: '60' },
              { color: 'primary', progress: '80' },
              { color: 'success', progress: '100' }
            ];

            if (result.errors.length < requirementsMeter.length) {
              requirementsIdx = requirementsMeter.length - result.errors.length - 1;
            }

            scope.requirementsColor = requirementsMeter[requirementsIdx].color;
            scope.requirementsProgress = requirementsMeter[requirementsIdx].progress;

            if (result.errors.length) {
              scope.popoverMsg = PasswordValidator.getPopoverMsg();
              scope.passwordErrors = result.errors;
              status = false;
            } else {
              scope.popoverMsg = '';
              scope.passwordErrors = [];
              status = true;
            }
          }
          return status;
        };
      }
    };
  }]);

'use strict';

angular.module('users')
  .directive('passwordVerify', [function() {
    return {
      require: 'ngModel',
      scope: {
        passwordVerify: '='
      },
      link: function(scope, element, attrs, ngModel) {
        var status = true;
        scope.$watch(function() {
          var combined;
          if (scope.passwordVerify || ngModel) {
            combined = scope.passwordVerify + '_' + ngModel;
          }
          return combined;
        }, function(value) {
          if (value) {
            ngModel.$validators.passwordVerify = function (password) {
              var origin = scope.passwordVerify;
              return (origin !== password) ? false : true;
            };
          }
        });
      }
    };
  }]);

'use strict';

// Users directive used to force lowercase input
angular.module('users').directive('lowercase', function () {
  return {
    require: 'ngModel',
    link: function (scope, element, attrs, modelCtrl) {
      modelCtrl.$parsers.push(function (input) {
        return input ? input.toLowerCase() : '';
      });
      element.css('text-transform', 'lowercase');
    }
  };
});

'use strict';

// Authentication service for user variables
angular.module('users').factory('Authentication', ['$window',
  function ($window) {
    var auth = {
      user: $window.user
    };

    return auth;
  }
]);

'use strict';

// PasswordValidator service used for testing the password strength
angular.module('users').factory('PasswordValidator', ['$window',
  function ($window) {
    var owaspPasswordStrengthTest = $window.owaspPasswordStrengthTest;

    return {
      getResult: function (password) {
        var result = owaspPasswordStrengthTest.test(password);
        return result;
      },
      getPopoverMsg: function () {
        var popoverMsg = 'Please enter a passphrase or password with greater than 10 characters, numbers, lowercase, upppercase, and special characters.';
        return popoverMsg;
      }
    };
  }
]);

'use strict';

// Users service used for communicating with the users REST endpoint
angular.module('users').factory('Users', ['$resource',
  function ($resource) {
    return $resource('api/users', {}, {
      update: {
        method: 'PUT'
      }
    });
  }
]);

//TODO this should be Users service
angular.module('users.admin').factory('Admin', ['$resource',
  function ($resource) {
    return $resource('api/users/:userId', {
      userId: '@_id'
    }, {
      update: {
        method: 'PUT'
      }
    });
  }
]);
