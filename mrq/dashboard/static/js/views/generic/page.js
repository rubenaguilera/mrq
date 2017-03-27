define(["backbone", "underscore", "jquery", "moment", "daterangepicker"],function(Backbone, _, $, moment) {

  /**
   * A generic page, that can have sub-pages.
   *
   */
  return Backbone.View.extend({


    alwaysRenderOnShow:false,

    // This will be called once before the first render only.
    init:function() {
      this.counters = {};
      this.initTimeFilter();
    },
    initok:false,

    initTimeFilter: function () {
      var todayRange = this.timeFilter.getTodayRange();
      var yesterdayRange = this.timeFilter.getYesterdayRange();
      var last7DaysRange = this.timeFilter.getLastXDays(7);
      var last30DaysRange = this.timeFilter.getLastXDays(30);
      var thisMonthRange = this.timeFilter.getThisMonthRange();
      var lastMonthRange = this.timeFilter.getLastMonthRange();
      var thisYearRange = this.timeFilter.getThisYearRange();
      $('#time_filter').daterangepicker({
        "timePicker24Hour": true,
        "timePicker": true,
        "locale": {
          "format": "DD/MM/YYYY HH:mm",
        },
        "ranges": {
          "Today": [
            todayRange.start,
            todayRange.end
          ],
          "Yesterday": [
            yesterdayRange.start,
            yesterdayRange.end
          ],
          "Last 7 Days": [
            last7DaysRange.start,
            last7DaysRange.end
          ],
          "Last 30 Days": [
            last30DaysRange.start,
            last30DaysRange.end
          ],
          "This Month": [
            thisMonthRange.start,
            thisMonthRange.end
          ],
          "Last Month": [
            lastMonthRange.start,
            lastMonthRange.end
          ],
          "This Year": [
            thisYearRange.start,
            thisYearRange.end
          ]
        },
      }, function (start, end, label) {
      });
      var self = this;
      $('.clear-date-range-filter').click(function(){
        $('#time_filter').val('');
      });
    },

    addChildPage: function(id, childPage) {
      if (!this.childPages) this.childPages = {};

      if (this.childPages[id]) this.removeChildPage(id);

      childPage.parentPage = this;
      this.childPages[id] = childPage;
      childPage.setApp(this.app);
    },

    setApp:function(app) {
      this.app = app;
      //add to all children
      _.each(this.childPages,function(cp) {
        cp.setApp(app);
      });
    },

    setActiveMenu:function(menu) {
      $("#in-sub-nav a").removeClass("active");
      $("#in-sub-nav a.js-nav-"+menu).addClass("active");
    },

    setOptions:function(options) {
      this.options = options;
    },

    showChildPage: function(childPageId, options) {

      var ret = false;

      this.currentChildPage = childPageId;

      _.each(this.childPages, function(page, id) {
        if (id != childPageId) {
          if (!options || !options.modal) {
            page.hide();
          }
        } else {
          ret = page;
        }
      });

      if (options && options.options) {
        ret.setOptions(options.options);
      }
      if (options && options.forceRender) {
        ret.flush();
      }
      if (options && options.modal) {
        ret.showModal();
      } else {
        ret.show();
      }

      return ret;
    },

    removeChildPage:function(pageId) {
      if (!this.childPages[pageId]) return;
      this.childPages[pageId].removeAllChildPages();
      this.childPages[pageId].delegateEvents({});
      this.childPages[pageId].hide();
      this.childPages[pageId].remove();
      delete this.childPages[pageId];
    },

    removeAllChildPages:function() {
      if (this.childPages && _.size(this.childPages)) {
        _.each(_.keys(this.childPages),function(k) {
          this.removeChildPage(k);
        },this);
      }
    },

    showModal: function() {
      if (!this.initok) {
        this.init();
        this.initok = true;
      }
      if (!this._rendered || this.alwaysRenderOnShow) {
        this._rendered = true;
        this.render();

      }
      $(this.el).show().modal({
        keyboard: true,
        backdrop: true,
        show: true
      });
    },

    show: function() {
      if (!this.initok) {
        this.init();
        this.initok = true;
      }
      if (!this._rendered || this.alwaysRenderOnShow) {
        this._rendered = true;
        this.render();

      }

      if (this.menuName) this.setActiveMenu(this.menuName);

      this.trigger("show");
      $(this.el).fadeIn();

    },

    hide: function() {
      $(this.el).hide();
      this.trigger("hide");
    },

    remove:function() {
      this.hide();
    },

    flush:function() {
      //If we're currently shown, re-render now
      if ($(this.el)[0].style.display!="none") {
        this.render();

      //If not, queue for rendering at the next show();
      } else {
        this._rendered = false;
      }
    },


    // Used mainly to generate sparklines across refreshes
    addToCounter: function(name, newvalue, maxvalues) {

      if (!this.counters[name]) this.counters[name] = [];

      this.counters[name].push({
        "date": +new Date(),
        "value": newvalue
      });

      if (this.counters[name].length > maxvalues) {
        this.counters[name].shift();
      }

      return _.pluck(this.counters[name], "value");

    },

    getCounterSpeed: function(name) {

      if ((this.counters[name] || []).length < 2) return 0;

      var last = this.counters[name].length - 1;
      var interval = (this.counters[name][last]["date"] - this.counters[name][0]["date"]) / 1000;
      var diff = this.counters[name][last]["value"] - this.counters[name][0]["value"];

      if (diff == 0) return 0;

      return diff / interval;

    },

    getCounterEta: function(name, total) {

      var speed = this.getCounterSpeed(name);

      if (speed >= 0) {
        return "N/A";
      } else {
        return moment.duration(total * 1000 / speed).humanize();
      }

    },

    renderTemplate:function(options,tpl,el) {

      //console.log(el,this.$el,app.templates[tpl || this.template]);
      (el||this.$el).html(_.template($(this.template).html())(_.defaults(options||{},{
        _: _,
        app: this.app
      })));
    },

    render:function() {
      return this;
    },

    updateTimeFilterClickBind: function(self){
      $('#time-filter-submit').unbind( 'click' ).bind( 'click', function() {
        self.filterschanged();
      });
    },

    unbindTimeFilterClick: function(){
      $('#time-filter-submit').unbind( 'click' );
    },

    timeFilter: {
      getTodayRange: function(){
        var dateStart = new Date();
        var dateEnd = new Date();
        dateStart = this.getBeginingOfDay(dateStart);
        dateEnd = this.getEndOfDay(dateEnd);
        return {
          start: dateStart,
          end: dateEnd
        };
      },
      getYesterdayRange: function(){
        var dateStart = new Date();
        var dateEnd = new Date();
        dateStart.setDate(dateStart.getDate() - 1);
        dateStart = this.getBeginingOfDay(dateStart);

        dateEnd.setDate(dateEnd.getDate() - 1);
        dateEnd = this.getEndOfDay(dateEnd);
        return {
          start: dateStart,
          end: dateEnd
        };
      },
      getLastXDays: function(x){
        var dateStart = new Date();
        var dateEnd = new Date();
        dateStart.setDate(dateStart.getDate() - x);
        dateStart = this.getBeginingOfDay(dateStart);
        return {
          start: dateStart,
          end: dateEnd
        };
      },
      getThisMonthRange: function(){
        var dateStart = new Date();
        var dateEnd = new Date();
        dateStart = this.getBeginingOfMonth(dateStart);

        dateEnd = this.getEndOfMonth(dateEnd);
        return {
          start: dateStart,
          end: dateEnd
        };
      },
      getLastMonthRange: function(){
        var dateStart = new Date();
        var dateEnd = new Date();
        dateStart.setMonth(dateStart.getMonth() - 1);
        dateStart = this.getBeginingOfMonth(dateStart);

        dateEnd.setMonth(dateEnd.getMonth() - 1);
        dateEnd = this.getEndOfMonth(dateEnd);
        return {
          start: dateStart,
          end: dateEnd
        };
      },
      getThisYearRange: function(){
        var dateStart = new Date();
        var dateEnd = new Date();
        dateStart = this.getBeginingOfYear(dateStart);

        dateEnd = this.getEndOfYear(dateEnd);
        return {
          start: dateStart,
          end: dateEnd
        };
      },

      getBeginingOfDay: function (date) {
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
        return date;
      },
      getEndOfDay: function (date) {
        date.setHours(23);
        date.setMinutes(59);
        date.setSeconds(59);
        date.setMilliseconds(999);
        return date;
      },
      getBeginingOfMonth: function (date) {
        date.setDate(1);
        date = this.getBeginingOfDay(date);
        return date;
      },
      getEndOfMonth: function (date) {
        date.setMonth(date.getMonth() + 1);
        date = this.getBeginingOfMonth(date);
        date.setMilliseconds(-1);
        return date;
      },
      getBeginingOfYear: function (date) {
        date.setMonth(0);
        date = this.getBeginingOfMonth(date);
        return date;
      },
      getEndOfYear: function(date){
        date.setFullYear(date.getFullYear() + 1);
        date = this.getBeginingOfYear(date);
        date.setMilliseconds(-1);
        return date;
      },
    }
  });

});
