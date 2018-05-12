'use strict';

// Declare app level module which depends on views, and components
let App = angular.module('myApp', [
    'ngRoute',
    // 'myApp.view1',
    // 'myApp.view2',
    'ngMaterial',
    'ngMessages'
]).config(['$locationProvider', '$routeProvider', '$mdThemingProvider',
    function ($locationProvider, $routeProvider, $mdThemingProvider) {
        $locationProvider.hashPrefix('!');
        // $routeProvider.otherwise({redirectTo: '/view1'});
        $mdThemingProvider.theme('default').primaryPalette('purple');
        $mdThemingProvider.enableBrowserColor();
    }
]).filter('character', function () {
    return function (input) {
        return String.fromCharCode(64 + parseInt(input, 10));
    };
});

App.controller('AppCtrl', ['$scope', '$http', function ($scope, $http) {
    $scope.currentEvent = null;
    $scope.currentPage = null;

    $scope.currentText = null;

    let pageMap = {};

    function initialize() {
        global.clear();
        local.clear();
        global.variable("姓名", "string").set("唐主席");
    }

    function replaceVariables(text) {
        return text.replace(/{([^{}]+)}/g, function (str, name) {
            return lookup(name).value();
        });
    }

    function recursiveAddText(currentText, textArray) {
        if (textArray === null) return;
        if (typeof textArray === "string") {
            currentText.push(replaceVariables(textArray));
            return;
        }
        for (let text of textArray) {
            if (typeof text === "string") {
                currentText.push(replaceVariables(text));
            } else {
                recursiveAddText(currentText, text.value());
            }
        }
    }

    function loadPage(label) {
        $scope.currentPage = pageMap[label];
        let currentText = [];
        recursiveAddText(currentText, $scope.currentPage.text);
        $scope.currentText = currentText;
        console.log($scope.currentPage);
    }

    function loadEvent(event) {
        $scope.currentEvent = event;
        console.log($scope.currentEvent);
        pageMap = {};
        for (let page of $scope.currentEvent.pages)
            pageMap[page.id] = page;
        initialize();
        loadPage('start');
    }

    $http.get('/static/scripts/新生舞会.js').then(function (response) {
        let currentScript = response.data;
        let event = eval(currentScript);
        loadEvent(event);
    });

    $scope.choose = function (index) {
        let jumpTarget = null;
        let actions = [];
        if ($scope.currentPage.hasOwnProperty('actions'))
            actions.push(...$scope.currentPage.actions);
        if (index === -1) {
            console.log("Choose continue");
        } else {
            let choice = $scope.currentPage.choices[index];
            console.log("Choose " + index + ": " + choice.text);
            if (choice.hasOwnProperty('actions'))
                actions.push(...choice.actions);
        }
        for (let action of actions) {
            let val = action.value();
            console.log(val);
            if (val instanceof Jump) {
                if (jumpTarget === null)
                    jumpTarget = val.label;
            }
        }
        if (jumpTarget === null) {
            console.log("End event");
            initialize();
            $scope.currentPage = {
                actions: [jump("start")]
            };
            $scope.currentText = [
                "事件结束。",
                "本来这里应该跳转到下一个事件。",
                "但是现在还没有跳转逻辑。",
                "也没有下一个事件。",
                "所以点继续会回到最开始，不妨尝试一下所有可能吧。"
            ];
        } else {
            loadPage(jumpTarget);
        }
    };
}]);
