import { Injectable } from '@angular/core';
import { CommsService } from "../comms/comms.service";
import * as moment from "moment";
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer/ngx';
import { File } from '@ionic-native/file/ngx';
import { SubscriberService } from '../subscriber/subscriber.service';
import { UserdataService } from '../userdata/userdata.service';
import { AlertController } from "@ionic/angular";

declare const window: any;

@Injectable({
  providedIn: 'root'
})

export class UtilsService {

  constructor(
    private subscriber: SubscriberService,
    private transfer: FileTransfer,
    private file: File,
    private comms: CommsService,
    private userData: UserdataService,
    private alertController: AlertController
    ) {}

  documentBase: string = null;
  targetPageID: string = null;
  targetAnchor: string = null;
  transitionPromise = null;
  pageVars: any = null;

  /**
   *
   * showForm - show a form
   *
   * @param {string} where - selector for form element into which to put the data
   * @param {Object} attrs - attributes of the table
   * @param {string} attrs.prefix - a prefix to attach to each form field ID
   * @param {string} attrs.save - text for the submit button
   * @param {string} attrs.cancel - text for the cancel button (if any)
   * @param {Object[]} attrs.fields - a list of fields to display
   * @param {boolean} attrs.fields.required - is the input required
   * @param {string} attrs.fields.inputtype - optional hint to the input element
   * @param {string} attrs.fields.name - name for the form element
   * @param {string} attrs.fields.title - title to display
   * @param {string} attrs.fields.type - input field type
   * @param {integer} attrs.fields.size - optional size for input field
   * @param {string[]} attrs.fields.options - reference to list of options for a menu
   * @param data - optional object with values for each form item
   *
   */
  showForm(where: string, attrs: any, data: any) {
    var menus = [];
    var ranges = [] ;
    var $form = $(where);
    if ($form.length) {
      // we found the element;  populate it
      $form.html("");
      if (attrs.hasOwnProperty("hidden")) {
        $.each(attrs.hidden, function (index, field) {
          $("<input type='hidden'>")
            .attr('name', index)
            .attr('value', field)
            .attr('id', attrs.prefix + index)
            .appendTo($form);
        }.bind(this));
      }

      // loop over the data
      $.each(attrs.fields, function (index, field) {
        var fid = field.name ? attrs.prefix + field.name : '';
        var labelID = fid ? fid + '_label' : '';
        var i;
        var c;
        if (field.type === "hidden" && field.name && data && data[field.name]) {
          i = $("<input type='hidden'>").attr('name', field.name).attr('value', data[field.name]);
        } else {
          c = this.buildFormFieldContainer(attrs, field);
          i = this.buildFormField(attrs, field, data);
          if (fid) {
            if (field.type === 'selectmenu') {
              menus.push({ id: fid, field: field });
            }
            if (field.type === 'range') {
              ranges.push(fid);
            }
          }
        }
        if (c) {
          if (i) {
            i.appendTo(c);
          }
          c.appendTo($form);
        } else {
          i.appendTo($form);
        }
      });
      // add submit buttons
      var width = -1;
      var count = 0;
      var grids = [ '', 'ui-grid-a', 'ui-grid-b', 'ui-grid-c'];
      var pos = ['ui-block-a', 'ui-block-b', 'ui-block-c', 'ui-block-d'];
      var controls = '';
      if (attrs.save) {
        width++;
        var save = attrs.save.replace(/ /, " <br class='ccs-break'>");
        controls += "<div class='" + pos[count++] + "'><a class='operation ui-btn ccsButtonSmall' id='" + attrs.prefix + "Save'>" + save + "</a></div>\n";
      }
      if (attrs.mod) {
        width++;
        var mod = attrs.mod.replace(/ /, " <br class='ccs-break'>");
        controls += "<div class='" + pos[count++] + "'><a data-theme='b' class='operation ui-btn ccsButtonSmall' id='" + attrs.prefix + "Modify'>" + mod + "</a></div>\n";
      }
      if (attrs.del) {
        width++;
        var del = attrs.del.replace(/ /, " <br class='ccs-break'>");
        controls += "<div class='" + pos[count++] + "'><a data-theme='c' class='operation ui-btn ccsButtonSmall' id='" + attrs.prefix + "Delete'>" + del + "</a></div>\n";
      }
      if (attrs.cancel) {
        width++;
        var cancel = attrs.cancel.replace(/ /, " <br class='ccs-break'>");
        controls += "<div class='" + pos[count++] + "'><a class='operation ui-btn ccsButtonSmall' id='" + attrs.prefix + "Cancel'>" + cancel + "</a></div>\n";
      }
      controls = "<div class='" + grids[width] + "'>\n" + controls + "</div>\n";


      /*
      $.each(menus, function(idx, ref) {
        var sopts = { "allowClear": false, "width": "100%", "theme": "ccs", "closeOnSelect": true, minimumResultsForSearch: 1, placeholder: "" };

        if (ref.field.hasOwnProperty('multiple') && ref.field.multiple === true) {
          sopts.closeOnSelect = false;
        } else {
          if (!ref.field.hasOwnProperty('required') || !ref.field.required ) {
            sopts.allowClear = true;
          }
          if (!ref.field.hasOwnProperty('searchable') || !ref.field.searchable ) {
            sopts.minimumResultsForSearch = Infinity;
          }
        }


        if (ref.field.hasOwnProperty('placeholder')) {
          sopts.placeholder = ref.field.placeholder;
        }

        var f =  $("#"+ref.id).select2(sopts);
        var $searchfield = $($("#"+ref.id)).parent().find('.select2-search--inline input');
        $searchfield.attr('data-role', 'none');
        $searchfield.attr('style', 'width: 90%');
      }); */
      $form.append(controls);

      // form is build - make sure jquery controls are initialized
      $form.trigger("create");
      $(".ui-icon-carat-d").addClass("ui-alt-icon");
    } else {
      console.log("selector " + where + " not in document!");
    }
  };

  buildFormFieldContainer(attribs: any, field: any) {
    // emit a container for this form field
    var fid = field.name ? attribs.prefix + field.name : '';
    var labelID = fid ? fid + '_label' : '';
    var r;
    var i;
    var c;

    if (attribs.containers) {
      if (field.break) {
        c = $("<div>");
      } else if (field.type === "divider") {
        c = $("<div class='ccsFormDivider'>");
      } else {
        c = $("<div class='ui-field-contain'>");
      }
      if (field.containerClass) {
        c.addClass(field.containerClass);
      }
    }

    if (field.title && field.type && field.type !== "button") {
      var l = field.type === 'divider' ? $("<span>" + field.title + "</span>") : $("<label>" + field.title + "</label>");
      if (fid) {
        l.attr('id', labelID).attr('for', fid);
      }
      if (field.tooltip) {
        l.attr('title', field.tooltip);
      }
      if (field.required) {
        $('<span class="required">*</span>').appendTo(l);
      }
      if (field.type === "selectmenu") {
        l.addClass("select");
      }
      if (field.type === "panel") {
        l.addClass("ccsFormPanel");
      }
      if (field.labelClass) {
        l.addClass(field.labelClass);
      }
      l.appendTo(c);
      if (field.break) {
        $("<br>").appendTo(c);
      }
    }
    return c;
  };

  buildFormField(attribs: any, field: any, data: any) {
    var fid = field.name ? attribs.prefix + field.name : '';
    var labelID = fid ? fid + '_label' : '';
    var r;
    var i;
    if (field.type === "hidden" && field.name && data && data[field.name]) {
      i = $("<input type='hidden'>").attr('name', field.name).attr('value', data[field.name]);
    } else {
      if (field.type === "button") {
        // okay - we have a button to embed in the form
        i = $("<button>");
        if (app.isNative) {
          i.attr('data-mini', 'true');
        }
        if (fid) {
          i.attr('id', fid);
        }
        if (field.title) {
          i.append(field.title);
        }
      } else if (field.type === "timepicker") {
        var optOutput = "";

        var opts = field.options;

        if (typeof (opts) === "string") {
          /* jshint evil:true */
          // it is the name of an object; get a reference to that
          opts = eval(opts);
        }

        if (typeof (opts) === "object") {
          if (!Array.isArray(opts) && opts.hasOwnProperty("data")) {
            opts = opts.data;
          }
        }

        // multiselect menu field
        i = $("<fieldset data-role='controlgroup' data-type='horizontal'>");
        var valueProp = "id";
        if (field.hasOwnProperty('valueProperty')) {
          valueProp = field.valueProperty;
        }
        var textProp = "description";
        if (field.hasOwnProperty('textProperty')) {
          textProp = field.textProperty;
        }

        // this one is special.  The value for the field is a number of seconds.
        // translate this into the appropriate unit
        var current = 0;
        if (field.name && data) {
          current = data[field.name];
        }

        var options = [
          {
            id: 'minutes',
            description: "Minutes",
            divisor: 60
          },
          {
            id: 'hours',
            description: "Hours",
            divisor: 3600
          },
          {
            id: 'days',
            description: "Days",
            divisor: 86400
          },
          {
            id: 'weeks',
            description: "Weeks",
            divisor: 604800
          }
        ];

        var currentUnit = 'minutes';
        if (!field.hasOwnProperty('required') || field.required === false) {
          currentUnit = '';
        }
        if (current) {
          for (var u = 3; u >= 0; u--) {
            if (current >= options[u].divisor) {
              currentUnit = options[u].id;
              current = current / options[u].divisor;
              u = -1;
            }
          }
        }
        // okay - now put in the input field AND the unit field
        var t = $("<input data-wrapper-class='controlgroup-textinput ui-btn' class='ccsTimeintervalText' size='5' type='number'>");
        if (fid) {
          t.attr('id', fid).attr('name', field.name);
        }
        if (current) {
          t.attr('value', current);
        }
        if (field.required) {
          t.attr('required', 'required');
        }

        // put this into the control group
        t.appendTo(i);
        // multiselect menu field
        var s = $("<select>");
        if (field.name) {
          s.attr('name', field.name + "_unit").attr('id', fid + "_unit");
        }
        // s.attr('data-role', 'none');
        if (0 && field.hasOwnProperty("canClear")) {
          if (field.canClear) {
            s.attr('data-clear-btn', 'true');
          }
        } else
        if (0 && attribs.canClear) {
          s.attr('data-clear-btn', 'true');
        }
        if (field.hasOwnProperty("placeholder")) {
          s.attr('data-placeholder', field.placeholder);
        }
        if (!field.hasOwnProperty("placeholder") && (!field.hasOwnProperty("required") || field.required === false)) {
          $("<option value=''>-- none --</option>").appendTo(s);
        } else if (field.hasOwnProperty("required") && field.required === true) {
          s.attr('required', 'required');
        }
        $.each(options, function (item, ref) {
          var o = $("<option>");
          o.attr('value', ref.id);
          if (currentUnit === ref.id) {
            o.attr('selected', 'selected');
          }
          o.append(ref.description);
          o.appendTo(s);
        });
        s.appendTo(i);
      } else if (field.type === "radio") {
        var optOutput = "";

        var opts = field.options;

        if (typeof (opts) === "string") {
          /* jshint evil:true */
          // it is the name of an object; get a reference to that
          opts = eval(opts);
        }

        if (typeof (opts) === "object") {
          if (!Array.isArray(opts) && opts.hasOwnProperty("data")) {
            opts = opts.data;
          }
        }

        // multiselect menu field
        i = $("<fieldset data-role='controlgroup' data-type='horizontal'>");
        var valueProp = "id";
        if (field.hasOwnProperty('valueProperty')) {
          valueProp = field.valueProperty;
        }
        var textProp = "description";
        if (field.hasOwnProperty('textProperty')) {
          textProp = field.textProperty;
        }


        var oCount = 0;
        $.each(opts, function (item, ref) {
          oCount++;
          // first - is there a test attribute?  It is a callback
          if (field.hasOwnProperty("test") && !field.test(ref)) {
            // the test function returned false; bail out
            return true;
          }
          var o = $("<input type='radio'>");
          if (field.name) {
            o.attr('name', field.name);
            o.attr('id', fid + oCount);
          }
          if (typeof (ref) === "object") {
            o.attr('value', ref[valueProp]);
          } else {
            o.attr('value', ref);
          }
          if (field.hasOwnProperty("radioClass")) {
            o.addClass(field.radioClass);
          }
          if (data && data[field.name]) {
            if (Array.isArray(data[field.name])) {
              if (data[field.name].indexOf(ref[valueProp]) !== -1) {
                o.attr('checked', 'checked');
              }
            } else if (typeof data[field.name] === "object") {
              if (data[field.name].hasOwnProperty(ref[valueProp])) {
                o.attr('checked', 'checked');
              }
            } else if (typeof ref === "object" && ref.hasOwnProperty(valueProp) && data[field.name] == ref[valueProp]) {
              o.attr('checked', 'checked');
            } else if (data[field.name] === ref) {
              o.attr('checked', 'checked');
            }
          }
          var t = "";
          if (field.hasOwnProperty("func") && typeof field.func === "function") {
            // there is a function to create the value
            t = field.func(ref);
          } else {
            if (typeof (ref) === "object") {
              t = ref[textProp];
            } else {
              t = ref;
            }
          }
          if (t) {
            if (fid) {
              o.append("<label for='" + fid + oCount + "'>" + t + "</label>");
            } else {
              o.append("<label>" + t + "</label>");
            }
          }
          o.appendTo(i);
        });

      } else if (field.type === "checkbox") {
        var optOutput = "";

        var opts = field.options;

        if (typeof (opts) === "string") {
          /* jshint evil:true */
          // it is the name of an object; get a reference to that
          opts = eval(opts);
        }

        if (typeof (opts) === "object") {
          if (!Array.isArray(opts) && opts.hasOwnProperty("data")) {
            opts = opts.data;
          }
        }

        // multiselect menu field
        i = $("<fieldset data-role='controlgroup' data-type='horizontal'>");
        if (field.hasOwnProperty('role') && field.role === 'none') {
          // if we are asserting no role, then use a span as a wrapper
          i = $("<span>");
        }
        var valueProp = "id";
        if (field.hasOwnProperty('valueProperty')) {
          valueProp = field.valueProperty;
        }
        var textProp = "description";
        if (field.hasOwnProperty('textProperty')) {
          textProp = field.textProperty;
        }
        if (field.class) {
          i.addClass(field.class);
        }

        var oCount = 0;
        $.each(opts, function (item, ref) {
          oCount++;
          // first - is there a test attribute?  It is a callback
          if (field.hasOwnProperty("test") && !field.test(ref)) {
            // the test function returned false; bail out
            return true;
          }
          var o = $("<input type='checkbox'>");
          if (field.name) {
            o.attr('name', field.name);
            o.attr('id', fid + oCount);
          }
          if (typeof (ref) === "object") {
            o.attr('value', ref[valueProp]);
          } else {
            o.attr('value', ref);
          }
          if (field.hasOwnProperty("radioClass")) {
            o.addClass(field.radioClass);
          }
          if (field.hasOwnProperty("role")) {
            o.attr('data-role', field.role);
          }
          if (data && data[field.name]) {
            if (Array.isArray(data[field.name])) {
              if (data[field.name].indexOf(ref[valueProp]) !== -1) {
                o.attr('checked', 'checked');
              }
            } else if (typeof data[field.name] === "object") {
              if (data[field.name].hasOwnProperty(ref[valueProp])) {
                o.attr('checked', 'checked');
              }
            } else if (typeof ref === "object" && ref.hasOwnProperty(valueProp) && data[field.name] == ref[valueProp]) {
              o.attr('checked', 'checked');
            } else if (data[field.name] === ref) {
              o.attr('checked', 'checked');
            }
          }
          var t = "";
          if (field.hasOwnProperty("func") && typeof field.func === "function") {
            // there is a function to create the value
            t = field.func(ref);
          } else {
            if (typeof (ref) === "object") {
              t = ref[textProp];
            } else {
              t = ref;
            }
          }
          if (t) {
            var label = $("<label class='ccsCheckboxLabel'>");
            if (fid) {
              label.attr('for', fid + oCount);
            }
            if (ref.class) {
              label.addClass(ref.class);
            }
            o.appendTo(label);
            label.append("&nbsp;");
            label.append(t);
            label.appendTo(i);
          } else {
            // no text - just dump the checkbox
            o.appendTo(i);
          }
        });

      } else if (field.type === "divider") {
        // I don't think we do anything
      } else if (field.type === "image" ) {
        // for an image field, just show the image.  A click handler will allow updates
        i = $("<img>");
        if (field.imageSize) {
          i.attr('width', field.imageSize);
        }
        if (data && data[field.name]) {
          i.attr('src', data[field.name]);
        }
      } else if (field.type !== "selectmenu") {
        // this is NOT a menu - just a regular input field
        if (field.disabled) {
          i = $("<div>");
        } else {
          i = $("<input>");
        }
        if (field.type === "textarea") {
          i = $("<textarea>");
        }
        if (fid) {
          i.attr('id', fid);
        }
        if (!field.disabled) {
          if (field.type !== 'range' && app.isNative) {
            i.attr('data-mini', 'true');
          }
          if (field.name) {
            i.attr('name', field.name);
          }
        } else {
          i.addClass('ui-input-text');
          i.addClass('ccsFormPanelValues');
        }
        if (field.type === "flipswitch") {
          i.attr('data-role', "flipswitch").attr('type', 'checkbox');
          if (field.value !== undefined) {
            i.attr('value', field.value);
          }
          if (field.onText) {
            i.attr('data-on-text', field.onText);
          }
          if (field.offText) {
            i.attr('data-off-text', field.offText);
          }
          if (field.flipClass) {
            i.attr('data-wrapper-class', field.flipClass);
          }
        } else if (field.type === "range") {
          i.attr('type', field.type).attr('data-highlight', 'true');
          if (field.hasOwnProperty('min')) {
            i.attr('min', field.min);
          }
          if (field.hasOwnProperty('max')) {
            i.attr('max', field.max);
          }
          if (field.hasOwnProperty('step')) {
            i.attr('step', field.step);
          }
          if (field.hasOwnProperty('default') && (!data || !data.hasOwnProperty(field.name))) {
            i.attr('value', field.default);
          }
        } else if (field.type !== "textarea") {
          i.attr('type', field.type);
        }
        if (!field.disabled) {
          if (attribs.hasOwnProperty("autocomplete") || field.hasOwnProperty("autocomplete")) {
            i.attr('autocomplete', (field.autocomplete || attribs.autocomplete));
          }
          if (attribs.canClear || field.canClear) {
            // i.attr('data-clear-btn', 'true');
          }
          if (field.inputtype) {
            i.attr('inputtype', field.inputtype);
          }
          if (field.size) {
            i.attr('size', field.size);
          }
          if (field.placeholder) {
            i.attr('placeholder', field.placeholder);
          }
        }
        if (data && data.hasOwnProperty(field.name)) {
          if (field.disabled) {
            if (field.func) {
              i.append(field.func(data[field.name]));
            } else {
              i.append(data[field.name]);
            }
            if (field.valueFunc) {
              $("<input type='hidden'>").attr('name', field.name).attr('value', field.valueFunc(data[field.name])).appendTo(i);
            } else {
              $("<input type='hidden'>").attr('name', field.name).attr('value', data[field.name]).appendTo(i);
            }
          } else {
            if (field.type === "flipswitch") {
              if (data[field.name] === 1) {
                i.prop('checked', true);
              } else {
                i.prop('checked', false);
              }
            } else {
              i.val(data[field.name]);
              if (field.type === "range") {
                i.attr('value', data[field.name]);
              }
            }
          }
        } else {
          // there is no data for this field.  is it 'disabled'?  in that case we should at least emit the hidden field
          if (field.disabled) {
            if (field.func) {
              i.append(field.func());
            }
            if (field.valueFunc) {
              $("<input type='hidden'>").attr('name', field.name).attr('value', field.valueFunc()).appendTo(i);
            } else {
              $("<input type='hidden'>").attr('name', field.name).appendTo(i);
            }
          } else if (field.hasOwnProperty("default")) {
            i.val(field.default);
          }
        }
        if (field.required) {
          i.attr('required', 'required');
        }
        if (field.minlength) {
          i.attr('minlength', field.minlength);
        }
      } else if (field.type === "selectmenu") {
        var optOutput = "";

        var opts = field.options;

        if (typeof (opts) === "string") {
          /* jshint evil:true */
          // it is the name of an object; get a reference to that
          opts = eval(opts);
        }

        if (typeof (opts) === "object") {
          if (!Array.isArray(opts) && opts.hasOwnProperty("data")) {
            opts = opts.data;
          }
        }
        // multiselect menu field
        i = $("<select>");
        if (field.name) {
          i.attr('name', field.name).attr('id', fid);
        }
        if (field.hasOwnProperty("multiple") && field.multiple) {
          i.attr('multiple', 'multiple');
        }
        if (!field.hasOwnProperty("placeholder") && (!field.hasOwnProperty("required") || field.required === false)) {
          i.attr('data-placeholder', '-- none --');
        } else if (field.hasOwnProperty("required") && field.required === true) {
          i.attr('required', 'required');
        }
        // add an empty option if there is a placeholder and we are single select
        if (!field.hasOwnProperty("multiple") || !field.multiple) {
          i.append($("<option>"));
        }
        // make sure jquery mobile doesn't do anything to us
        i.attr('data-role', 'none');
        if (field.hasOwnProperty("canClear")) {
          if (field.canClear) {
            i.attr('data-allow-clear', 'true');
          }
        } else
        if (attribs.canClear) {
          i.attr('data-allow-clear', 'true');
        }
        if (field.hasOwnProperty("placeholder")) {
          i.attr('data-placeholder', field.placeholder);
        }
        var valueProp = "id";
        if (field.hasOwnProperty('valueProperty')) {
          valueProp = field.valueProperty;
        }
        var textProp = "description";
        if (field.hasOwnProperty('textProperty')) {
          textProp = field.textProperty;
        }

        if (opts) {
          $.each(opts, function (item, ref) {
            // first - is there a test attribute?  It is a callback
            if (field.hasOwnProperty("test") && !field.test(ref)) {
              // the test function returned false; bail out
              return true;
            }
            var o = $("<option>");
            if (typeof (ref) === "object") {
              o.attr('value', ref[valueProp]);
            } else {
              o.attr('value', ref);
            }
            if (data && data[field.name]) {
              if (Array.isArray(data[field.name])) {
                if (data[field.name].indexOf(ref[valueProp]) !== -1) {
                  o.attr('selected', 'selected');
                }
              } else if (typeof data[field.name] === "object") {
                if (data[field.name].hasOwnProperty(ref[valueProp])) {
                  o.attr('selected', 'selected');
                }
              } else if (typeof ref === "object" && ref.hasOwnProperty(valueProp) && data[field.name] == ref[valueProp]) {
                o.attr('selected', 'selected');
              } else if (data[field.name] === ref) {
                o.attr('selected', 'selected');
              }
            }
            if (field.hasOwnProperty("func") && typeof field.func === "function") {
              // there is a function to create the value
              o.append(field.func(ref));
            } else {
              if (typeof (ref) === "object") {
                o.append(ref[textProp]);
              } else {
                o.append(ref);
              }
            }
            o.appendTo(i);
          });
        }
        var d = $("<div class='ui-select ccsSelect2'>");
        i.appendTo(d);
        i = d;
      }
    }
    return i;
  };

  /* showList - show a collection of data as a (nested) list
   *
   * @param where - selector for element into which to put the data
   * @param attrs - attributes of the table
   * @param attrs.class - a class for each table row
   * @param attrs.columns - definition of the fields to display
   *                       each field can be either a String or an object
   *                       with attributes that are applied to the output
   *                       in the table.
   * @param data - list of records to display
   */
  showList(where: string, attrs: any, data: any) {
    var $list = $(where);
    if ($list.length) {
      if (data && Object.keys(data).length) {
        // we found the element;  populate it
        $list.html("");

        // loop over the data
        $.each(data, function (index : number, row) {
          // capture information about the row so events know what
          // data to reference
          var r = "<li data-row='" + index + "'>";
          r += "<a";
          if (attrs.class1) {
            r += ' class="' + attrs.class1 + '"';
          }
          r += '>';
          $.each(attrs.columns, function (column, name) {
            var c = "";
            var t = "";
            var d = "";
            if ("string" === typeof (name)) {
              c = row[name];
            } else if (name.hasOwnProperty('func') && typeof name.func === "function") {
              var from = name.id;
              if (name.hasOwnProperty("fromID")) {
                from = name.fromID;
              }
              if (name.separator) {
                c = name.separator;
              }
              c += name.func(row[from]);
            } else {
              if (name.separator) {
                c = name.separator;
              }
              c += row[name.id];
            }
            if (c === null || c === undefined) {
              c = "";
            }
            r += c;
          });
          r += '</a>';
          if (attrs.class2) {
            r += '<a';
            r += ' class="' + attrs.class2 + '">';
            r += "</a>\n";
          }
          r += "</li>\n";
          $list.append(r);
        });
        // $list.listview("refresh");
      }
    } else {
      console.log("selector " + where + " not in document!");
    }
  };
  /**
   * dateTimeFormat - return the time in Year/month/date hour:second
   *
   * @Param unixTime - time stamp of observation.
   * @param none - optional string that will be used if the time is zero
   * @param omitYear - optional boolean indicating the year should be omitted.  Defaults to false
   */
  public dateTimeFormat(unixTime, none: string = null, omitYear: boolean = false) {
    if (unixTime) {
      if (this.userData.getUnits('time') === '24h') {
        if (omitYear) {
          return moment(unixTime * 1000).format('MMM DD HH:mm');
        } else {
          return moment(unixTime * 1000).format('MMM DD, YYYY HH:mm');
        }
      } else {
        if (omitYear) {
          return moment(unixTime * 1000).format('MMM DD h:mm A');
        } else {
          return moment(unixTime * 1000).format('MMM DD, YYYY h:mm A');
        }
      }
    } else {
      if (none !== null) {
        return none;
      } else {
        return 'None';
      }
    }
  }

  public timeFormat(theTime, none?) {
    if (theTime) {
      if (theTime < 10000000000) {
        theTime *= 1000;
      }
      if (this.userData.getUnits('time') === '24h') {
        return moment(theTime).format('HH:mm');
      } else {
        return moment(theTime).format('h:mm A');
      }
    } else {
      if (none !== undefined) {
        return none;
      } else {
        return 'None';
      }
    }
  };

  /**
   * showChecklist - display a checklist enabled list
   *
   * @param {Object} theList - jquery object that is a listview
   * @param {Array} list - Array of item objects to display
   * @param {Object} options - tunable options
   * @param {String} [options.id] - name of property to use as value from list. Defaults to 'id'.
   * @param {Array} [options.selected] - a list of items that are already selected.  No default.
   * @param {Array} [options.skip] - the name of a property that indicates an item should be skipped unless its value is 'falsy'. No default.
   * @param {Function} [options.skipFunc] - reference to a function that will return true if an item should be skipped.  No default.
   * @param {Array} [options.omit] - a list of items that should be omitted.  No default.
   * @param {String} [options.dataName] - a name for a data- attribute on the list item.  Default is 'data-id'
   * @param {String} [options.itemClass] - a class to use for the list item.  Default is 'ccsCheckboxMenuItem'.
   * @param {String} [options.valueClass] - a class to use for the value portion.  Default is 'ccsCheckboxMenuEntry'.
   * @param {String} [options.display] - name of property to use for displaying the list item. Defaults to 'name'.
   * @param {Function} [options.displayFunc] - reference to a function to use for displaying the list item.  If present, this is preferred over the display option.
   * @param {Function} [options.imageFunc] - reference to a function to use for displaying an image to the left of the value.  Defaults to none.
   * @param {Integer} [options.width] - the width of the display area.  Defaults to 284 pixels.
   * @param {Integer} [optoions.imageWidth] - the width of the image if any.  Defaults to 75 pixels and will be removed from the display area width if it is used.
   *
   * NOTE: Items will be displayed in the order they are found in the list.
   *
   */

  showChecklist(theList: any, list: any, options: any ) {
    theList = $(theList);
    theList.html("");

    var skipProp = null;
    var skipFunc = null;
    var idProp = 'id';
    var displayFunc = null;
    var displayProp = 'name';
    var omitList = null;
    var selectedList = null;
    var imageFunc = null;
    var itemClass = 'ccsCheckboxMenuItem';
    var valueClass = 'ccsCheckboxMenuEntry';
    var dataName = 'data-id';
    var displayWidth = 284;
    var imageWidth = 75;
    var showCheckbox = true;

    if (options) {
      if (options.hasOwnProperty('showCheckbox')) {
        showCheckbox = options.showCheckbox;
      }
      if (options.hasOwnProperty('imageFunc')) {
        imageFunc = options.imageFunc;
      }
      if (options.hasOwnProperty('displayWidth')) {
        displayWidth = options.displayWidth;
      }
      if (options.hasOwnProperty('imageWidth')) {
        imageWidth = options.imageWidth;
      }
      if (options.hasOwnProperty('itemClass')) {
        itemClass = options.itemClass;
      }
      if (options.hasOwnProperty('valueClass')) {
        valueClass = options.valueClass;
      }
      if (options.hasOwnProperty('dataName')) {
        dataName = options.dataName;
      }
      if (options.hasOwnProperty('omit')) {
        omitList = options.omit;
      }
      if (options.hasOwnProperty('selected')) {
        selectedList = options.selected;
      }
      if (options.hasOwnProperty('id')) {
        idProp = options.id;
      }
      if (options.hasOwnProperty('skip')) {
        skipProp = options.skip;
      }
      if (options.hasOwnProperty('skipFunc')) {
        skipFunc = options.skipFunc;
      }
      if (options.display) {
        displayProp = options.display;
      }
      if (options.displayFunc) {
        displayFunc = options.displayFunc;
      }
    }

    $.each(list, function(j, ref) {
      if (!skipProp || ! ref[skipProp]) {
        // is this used in the omit list
        var skip = false;
        if (skipFunc) {
          if (skipFunc(ref)) {
            skip = true;
          }
        }
        if (!skip && omitList) {
          $.each(omitList, function(idx, omitID) {
            if (parseInt(omitID) === parseInt(ref[idProp])) {
              skip = true;
              return false;
            }
          });
        }
        if (skip) {
          // skip this one
          return true;
        }
        var checked = "";
        var checkedClass = "";
        if (selectedList) {
          $.each(selectedList, function(idx, selectedID) {
            if (parseInt(selectedID) === parseInt(ref[idProp])) {
              checked='checked="checked"';
              checkedClass="ccsCheckboxMenuItemSelected";
              return false;
            }
          });
        }
        var w = displayWidth;
        var h = "<li " + dataName + "='" + ref[idProp] + "' class='" + itemClass + " " + checkedClass + "'>";
        if (showCheckbox) {
          h += "<input type='checkbox' " + checked + " value='" + ref[idProp] + "'>";
        } else {
          h += "<div class='ccsCheckboxNoCheck'></div>";
        }
        var v = "";
        var a = null;
        if (imageFunc) {
          a = imageFunc(ref);
          if (a) {
            h += a;
            w -= imageWidth;
          }
        }
        if (displayFunc) {
          v = displayFunc(ref);
        } else if (ref.hasOwnProperty(displayProp)) {
          v = ref[displayProp];
        } else {
          v = "UNKNOWN NAME for value " + ref[idProp];
        }
        h += "<div style='width: " + w + "px;' class='" + valueClass + "'>" + v + "</div>";
        h += "</li>";
        theList.append($(h));
      }
    });

    return;
  };

  /**
   * showTable - show a table of data
   *
   * @param {String} where - selector for element into which to put the data
   * @param {Object} attrs - attributes of the table
   * @param {String} attrs.title - a title to display above the table
   * @param {String} attrs.class - a class for each table row
   * @param {String} attrs.checkbox - the name of an input field to associate with a checkbox on each row
   * @param {String} attrs.checkboxProp - the name of a data table property to use to supply the value for each checkbox
   * @param {String} attrs.width - a width to use on the column
   * @param {String} attrs.rowClass - a class for rows of the column in the body (use with headerClass)
   * @param {Function} attrs.rowClassFunc - a function that will return a class for rows of the column in the body (use with headerClass)
   * @param {String} attrs.rowprop - the name of the an attribute to apply to the row
   * @param {String} attrs.rowvaluefrom - the name of a property in the data object for each how that will populate the rowprop attribute
   * @param {Function} attrs.lookupFunc - a function that is passed the reference each item from the data attribute and returns the dataitem to use
   * @param {Function} attrs.test - a function that will be passed the row (or the return of lookupFunc).  It returns false if the row should be skipped
   * @param {Object} attrs.columns - definition of the fields to display
   *                       each field can be either a String or an object
   *                       with attributes that are applied to the output
   *                       in the table.
   * @param {String} attrs.columns.class - a class for the column
   * @param {String} attrs.columns.type - a type for the column (e.g., button)
   * @param {String} attrs.columns.headerClass - a class for the header of the column (e.g., button)
   * @param {String} attrs.columns.rowClass - a class for rows of the column in the body (use with headerClass)
   * @param {Function} attrs.columns.rowClassFunc - a function that will return a class for rows of the column in the body (use with headerClass)
   * @param {String} attrs.columns.title - a title for the column (this will have a span class='sort-icon' appended to it)
   * @param {String} attrs.columns.rowprop - the name of the an attribute to apply to the row
   * @param {Function} attrs.columns.lookupFunc - a function passed the reference each item from the data attribute
   * @param {Function} attrs.columns.test - a function that will be passed the row (or the return of lookupFunc).  It returns false if the row should be skipped
   *
   * @param data - list of records to display
   */
  showTable(where: any, attrs: any, data: any) {
    var $table = $(where);
    if ($table.length) {
        // we found the element;  populate it
        $table.html("");

        var sortCols = {};

        var numCols = attrs.columns.length;
        if (attrs.hasOwnProperty("checkbox")) {
          numCols += 1;
        }
        // create the heading row
        var h = "<thead>";
        if (attrs.title) {
          h += "<th><th colspan='" + numCols + "'>" + attrs.title + "</th></tr>\n";
        }
        h += "<tr>";
        if (attrs.hasOwnProperty("checkbox")) {
          h += "<th></th>";
        }
        $.each(attrs.columns, function (column, name) {
          var t = "";
          if (name.hasOwnProperty("sorter")) {
            sortCols[column] = { sorter: name.sorter };
          }
          if (name.hasOwnProperty("class") && (name.hasOwnProperty("type") && (name.type !== "button" || name.hasOwnProperty("topbutton")))) {
            t += ' class="' + name.class + '"';
          } else if (name.hasOwnProperty("headerClass")) {
            t += ' class="' + name.headerClass + '"';
          }
          if (name.hasOwnProperty('width')) {
            t += ' width="' + name.width + '"';
          }
          if ("string" === typeof (name)) {
            h += "<th" + t + ">" + name;
          } else if (name.hasOwnProperty("type") && name.type === "button" && name.hasOwnProperty("topbutton")) {
            // the field is not FROM content
            h += "<th" + t + ">" + name.title;
          } else {
            h += "<th" + t + ">" + name.title;
          }
          h += "<span class='sort-icon'></span></th>";
        });
        h += "</tr></thead>";
        $table.append(h);
        var $body = $table.append("<tbody>");

        // loop over the data
        $.each(data, function (index, rowItem) {
          // capture information about the row so events know what
          // (really) first - is there a method we need to call to dereference the item
          var row = rowItem;
          if (attrs.lookupFunc) {
            row = attrs.lookupFunc(rowItem);
            if (!row) {
              return true;
            }
          }
          // first - is there a test attribute?  It is a callback
          if (attrs.hasOwnProperty("test") && !attrs.test(row)) {
            // the test function returned false; bail out
            return true;
          }
          // data to reference
          var r = $("<tr data-row='" + index + "'>");
          if (attrs.class) {
            r.attr('class', attrs.class);
          } else if (attrs.rowClass) {
            r.attr('class', attrs.rowClass);
          }
          if (attrs.rowClassFunc) {
            var c = attrs.rowClassFunc(row, data);
            if (c && c !== "") {
              r.addClass(c);
            }
          }
          if (attrs.rowprop) {
            if($.isArray(attrs.rowprop) && (attrs.rowprop.length === attrs.rowvaluefrom.length)){
              for(var i =0; i< attrs.rowprop.length; i++){
                r.attr(attrs.rowprop[i], row[attrs.rowvaluefrom[i]]);

              }
            }
            else{
              r.attr(attrs.rowprop, row[attrs.rowvaluefrom]);
            }
          }
          if (attrs.hasOwnProperty("checkbox")) {
            r.append("<td></td>");
          }
          $.each(attrs.columns, function (column, name) {
            var c;
            var cell = $("<td>");
            if ("string" === typeof (name)) {
              c = row[name];
            } else {
              // this is an object about a column
              if (name.hasOwnProperty('func') && typeof name.func === "function") {
                var from = name.id;
                if (name.hasOwnProperty("fromID")) {
                  from = name.fromID;
                }
                c = name.func(row[from], row);
              } else if (name.hasOwnProperty("fromID")) {
                cell.attr('data-value', row[name.fromID]);
                c = row[name.id];
              } else if (name.hasOwnProperty("type") && name.type === "button") {
                // the field is not FROM content
                var b = $("<a class='ui-btn ccsButtonSmall'>");
                if (name.hasOwnProperty("buttonText")) {
                  b.html(name.buttonText);
                } else {
                  b.html("Edit");
                }
                if (name.hasOwnProperty("buttonClass")) {
                  b.addClass(name.buttonClass);
                }
                b.attr('data-value', row[name.fromID]).appendTo(cell);
              } else {
                c = row[name.id];
              }
              if (name.hasOwnProperty("class")) {
                cell.addClass(name.class);
              }
              if (name.hasOwnProperty("cellprop")) {
                if (name.hasOwnProperty("cellval")) {
                  cell.attr(name.cellprop, row[name.cellval]);
                } else {
                  cell.attr(name.cellprop, c);
                }
              }
            }
            if (c) {
              cell.append(c);
            }
            cell.appendTo(r);
          }.bind(this));
          r.appendTo($body);
        }.bind(this));
        var sortOpts = { widgets: ["saveSort"], "sortList": [[0, 0]], "headers": {} };
        if (Object.keys(sortCols).length) {
          sortOpts.headers = sortCols;
        }
        try {
          // $table.table("refresh");
        } catch (e) {
          // console.log("Error: " + e.toString());
        }
    } else {
      console.log("selector " + where + " not in document!");
    }
  };

  /* showTimer(container: any, time: number) {
    // empty the container
    $(container).html();
    var bar = new ProgressBar.Circle(container, {
      color: '#aaa',
      // This has to be the same size as the maximum width to
      // prevent clipping
      strokeWidth: 50,
      trailWidth: 1,
      duration: time,
      text: {
        autoStyleContainer: false
      },
      from: { color: '#aaa', width: 1 },
      to: { color: '#333', width: 4 },
      step: function (state, circle) {
        circle.path.setAttribute('stroke', state.color);
        circle.path.setAttribute('stroke-width', state.width);
      }
    });
    bar.animate(1.0);
    return bar;
  } ; */

  /**
   * secsToDuration - convert seconds into a duration
   *
   * @param {Integer} seconds
   *
   * @returns {String} hh:mm:ss
   */

  secsToDuration(totalSeconds) : string {
    var t = parseInt(totalSeconds);
    var days = Math.floor(t / (3600 * 24));
    var hours = Math.floor((t - (days * 3600 * 24)) / 3600);
    var minutes = Math.floor((t - (days * 3600 * 24) - (hours * 3600)) / 60);
    var seconds = t - (days * 3600 * 24) - (hours * 3600) - (minutes * 60);

    // round seconds
    seconds = Math.round(seconds * 100) / 100;

    var result = "";
    if (days) {
      hours += days * 24;
    }

    result += (hours < 10 ? "0" + hours : hours);
    result += ":" + (minutes < 10 ? "0" + minutes : minutes);
    result += ":" + (seconds < 10 ? "0" + seconds : seconds);
    return result;
  };

	/**
	 * Interpret byte buffer as little endian 8 bit integer.
	 * Returns converted number.
	 * @param {ArrayBuffer} data - Input buffer.
	 * @param {number} offset - Start of data.
	 * @return Converted number.
	 * @public
	 */
  littleEndianToInt8(data: any, offset: number): number {
    var x = this.littleEndianToUint8(data, offset);
    if (x & 0x80) {
      x = x - 256;
    }
    return x;
  };

	/**
	 * Interpret byte buffer as unsigned little endian 8 bit integer.
	 * Returns converted number.
	 * @param {ArrayBuffer} data - Input buffer.
	 * @param {number} offset - Start of data.
	 * @return Converted number.
	 * @public
	 */
  littleEndianToUint8(data: any, offset: number): number {
    return data[offset];
  };

	/**
	 * Interpret byte buffer as little endian 16 bit integer.
	 * Returns converted number.
	 * @param {ArrayBuffer} data - Input buffer.
	 * @param {number} offset - Start of data.
	 * @return Converted number.
	 * @public
	 */
  littleEndianToInt16(data: any, offset: number) : number {
    return (this.littleEndianToInt8(data, offset + 1) << 8) +
      this.littleEndianToUint8(data, offset);
  };

	/**
	 * Interpret byte buffer as unsigned little endian 16 bit integer.
	 * Returns converted number.
	 * @param {ArrayBuffer} data - Input buffer.
	 * @param {number} offset - Start of data.
	 * @return Converted number.
	 * @public
	 */
  littleEndianToUint16(data: any, offset: number): number {
    return (this.littleEndianToUint8(data, offset + 1) << 8) +
      this.littleEndianToUint8(data, offset);
  };

	/**
	 * Interpret byte buffer as unsigned little endian 32 bit integer.
	 * Returns converted number.
	 * @param {ArrayBuffer} data - Input buffer.
	 * @param {number} offset - Start of data.
	 * @return Converted number.
	 * @public
	 */
  littleEndianToUint32(data: any, offset: number): number {
    return (this.littleEndianToUint8(data, offset + 3) << 24) +
      (this.littleEndianToUint8(data, offset + 2) << 16) +
      (this.littleEndianToUint8(data, offset + 1) << 8) +
      this.littleEndianToUint8(data, offset);
  };


	/**
	 * Interpret byte buffer as signed big endian 16 bit integer.
	 * Returns converted number.
	 * @param {ArrayBuffer} data - Input buffer.
	 * @param {number} offset - Start of data.
	 * @return Converted number.
	 * @public
	 */
  bigEndianToInt16(data: any, offset: number) : number {
    return (this.littleEndianToInt8(data, offset) << 8) +
      this.littleEndianToUint8(data, offset + 1);
  };

	/**
	 * Interpret byte buffer as unsigned big endian 16 bit integer.
	 * Returns converted number.
	 * @param {ArrayBuffer} data - Input buffer.
	 * @param {number} offset - Start of data.
	 * @return Converted number.
	 * @public
	 */
  bigEndianToUint16(data: any, offset: number) : number {
    return (this.littleEndianToUint8(data, offset) << 8) +
      this.littleEndianToUint8(data, offset + 1);
  };

	/**
	 * Interpret byte buffer as unsigned big endian 32 bit integer.
	 * Returns converted number.
	 * @param {ArrayBuffer} data - Input buffer.
	 * @param {number} offset - Start of data.
	 * @return Converted number.
	 * @public
	 */
  bigEndianToUint32(data: any, offset: number) : number{
    return (this.littleEndianToUint8(data, offset) << 24) +
      (this.littleEndianToUint8(data, offset + 1) << 16) +
      (this.littleEndianToUint8(data, offset + 2) << 8) +
      this.littleEndianToUint8(data, offset + 3);
  };

	/**
	 * Converts a single Base64 character to a 6-bit integer.
	 * @private
	 */
  b64ToUint6(nChr) {
    return nChr > 64 && nChr < 91 ?
      nChr - 65
      : nChr > 96 && nChr < 123 ?
        nChr - 71
        : nChr > 47 && nChr < 58 ?
          nChr + 4
          : nChr === 43 ?
            62
            : nChr === 47 ?
              63
              :
              0;
  };

	/**
	 * Decodes a Base64 string. Returns a Uint8Array.
	 * nBlocksSize is optional.
	 * @param {String} sBase64
	 * @param {int} nBlocksSize
	 * @return {Uint8Array}
	 * @public
	 */
  base64DecToArr(sBase64, nBlocksSize) {
    var sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, "");
    var nInLen = sB64Enc.length;
    var nOutLen = nBlocksSize ?
      Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize
      : nInLen * 3 + 1 >> 2;
    var taBytes = new Uint8Array(nOutLen);

    for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
      nMod4 = nInIdx & 3;
      nUint24 |= this.b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
      if (nMod4 === 3 || nInLen - nInIdx === 1) {
        for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++ , nOutIdx++) {
          taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
        }
        nUint24 = 0;
      }
    }

    return taBytes;
  };

	/**
	 * Returns the integer i in hexadecimal string form,
	 * with leading zeroes, such that
	 * the resulting string is at least byteCount*2 characters long.
	 * @param {int} i
	 * @param {int} byteCount
	 * @public
	 */
  toHexString(i, byteCount) {
    var string = Number(i).toString(16);
    while (string.length < byteCount * 2) {
      string = '0' + string;
    }
    return string;
  };

	/**
	 * Takes a ArrayBuffer or TypedArray and returns its hexadecimal representation.
	 * No spaces or linebreaks.
	 * @param data
	 * @public
	 */
  typedArrayToHexString(data) {
    // view data as a Uint8Array, unless it already is one.
    if (data.buffer) {
      if (!(data instanceof Uint8Array)) {
        data = new Uint8Array(data.buffer);
      }
    } else if (data instanceof ArrayBuffer) {
      data = new Uint8Array(data);
    } else {
      throw "not an ArrayBuffer or TypedArray.";
    }
    var str = '';
    for (var i = 0; i < data.length; i++) {
      str += this.toHexString(data[i], 1);
    }
    return str;
  };


  getFormData(f) {
    var fData = {};
    $.each(f.serializeArray(), function () {
      if (fData[this.name] !== undefined) {
        if (!fData[this.name].push) {
          fData[this.name] = [fData[this.name]];
        }
        fData[this.name].push(this.value || '');
      } else {
        fData[this.name] = this.value || '';
      }
    });
    return fData;
  };

  copyProperties(target, source) {
    Object.keys(source).forEach(function (key) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    });
  };

  // getState - return the state of the module level data
  getState () {
    var ret = {};
    Object.keys(this).forEach(function (key) {
      if (this.hasOwnProperty(key) && typeof this[key] !== 'function') {
        ret[key] = this[key];
      }
    }.bind(this));
    return ret;
  };

  // setState - update the state to restore it to a known configuration

  setState(state) {
    if (state && typeof state === "object") {
      Object.keys(this).forEach(function (key) {
        if (this.hasOwnProperty(key) && typeof this[key] !== 'function' && state[key] !== undefined) {
          this[key] = state[key];
        }
      }.bind(this));
    }
  };

  escape(str) {
    return str.replace(/'/g, '\\\'');
  };
  mean(numbers) {
    // mean of [3, 5, 4, 4, 1, 1, 2, 3] is 2.875
    var total = 0,
      i;
    for (i = 0; i < numbers.length; i += 1) {
      total += numbers[i];
    }
    return total / numbers.length;
  };
  median(numbers) {
    // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
    var median = 0,
      numsLen = numbers.length;
    numbers.sort();
    if (numsLen % 2 === 0) { // is even
      // average of two middle numbers
      median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
    } else { // is odd
      // middle number only
      median = numbers[(numsLen - 1) / 2];
    }
    return median;
  };
  mode(numbers) {
    // as result can be bimodal or multimodal,
    // the returned result is provided as an array
    // mode of [3, 5, 4, 4, 1, 1, 2, 3] = [1, 3, 4]
    var modes = [],
      count = [],
      i,
      number,
      maxIndex = 0;
    for (i = 0; i < numbers.length; i += 1) {
      number = numbers[i];
      count[number] = (count[number] || 0) + 1;
      if (count[number] > maxIndex) {
        maxIndex = count[number];
      }
    }
    for (i in count) if (count.hasOwnProperty(i)) {
      if (count[i] === maxIndex) {
        modes.push(Number(i));
      }
    }
    return modes;
  };
  range(numbers) {
    // range of [3, 5, 4, 4, 1, 1, 2, 3] is [1, 5]
    numbers.sort();
    return [numbers[0], numbers[numbers.length - 1]];
  };

  makeArray( item: any, func?: Function ) {
    if (item === undefined) {
      return [];
    }
    if (typeof(item) === "string") {
      if (func !== undefined) {
        return [ func(item) ];
      } else {
        return [ item ];
      }
    } else {
      if (func !== undefined) {
        var r = [];
        $.each(item, function(i,v) {
          r.push(func(v));
        });
        item = r;
      }
      return item;
    }
  };
  /**
   * sortArray - sort an array of objects by various properties
   *
   * @param {Array} list - a reference to  list of objects to sort
   * @param {Array} columns[] - a reference to a list of column objects to use for sort criteria
   * @param {string} columns.name - the name of a property to sort using
   * @param {string} columns.function - an optional reference to a function to use to interpret the data
   */

  sortArray(list, columns: any) {
    var ret = [];
    if (list && typeof list === "object" && Array.isArray(list) && list.length) {
      // it is a list and there are items in it
      ret = list.sort(function(a, b) {
        var winner = 0;
        if (columns && typeof columns === "object" && Array.isArray(columns) && columns.length) {
          $.each(columns, function(idx, ref) {
            if (ref.name && a.hasOwnProperty(ref.name) && b.hasOwnProperty(ref.name)) {
              // we can sort by this
              var ia = a[ref.name];
              var ib = b[ref.name];
              if (ref.hasOwnProperty('function') && typeof ref.function === "function") {
                ia = ref.function(ia);
                ib = ref.function(ib);
              }
              if (ia > ib) {
                winner = 1;
                return false;
              }
              if (ib > ia) {
                winner = -1;
                return false;
              }
              winner = 0;
            }
          });
        } else {
          console.error("No columns defined no idea how to sort");
        }
        return winner;
      });
    }
    return ret;
  };

  toLowerCase(item:any) {
    if (item && typeof item === "string") {
      return item.toLowerCase();
    } else {
      return item;
    }
  };

  writeFile(fileEntry, theBlob) {
    return new Promise((resolve, reject) => {
    fileEntry.createWriter(function (fw) {
      fw.onwriteend = function() {
        console.log("file written");
        resolve(fileEntry);
      };
      fw.onerror = function(err) {
        console.log("File write failed: " + err.toString());
        reject(err);
      };
      fw.write(theBlob);
    });
  });
  };

  /**
   * uploadObject - send a blob to CCS server to create an object
   *
   * @param {blob} theBlob - the Blob to send
   * @param {String} mediaType - the media type of the Blob
   * @param {String} objectType - the type of the object in the CCS system
   * @param {String} [objectSubType] - the subtype of the object
   *
   * @returns {Promise} that resolves when the blob has been sent with the response
   */
  uploadObject(theBlob, mediaType, objectType, objectSubtype?: any): Promise<any> {

    let typeMap = {
      'image/png': 'png',
      'image/jpeg': 'jpeg'
    };

    let d = new Promise((resolve, reject) => {
      window.requestFileSystem(window.TEMPORARY, 50*1024*1024,(fs) => {
        let fn = "upload." + typeMap[mediaType];
        let dir = fs.root;
        dir.getFile(fn, {create: true, exclusive: false },(fe) => {
          this.writeFile(fe, theBlob)
          .then((theFile: any) => {
            // okay - the file is filled with the blob data
            let fURL = theFile.toURL();
            // sendObject will resolve or reject the promise
            this._sendObject(fURL, mediaType, objectType, objectSubtype).then((result: any) => {
              resolve(result);
            }).catch((error: any) => {
              reject(error);
            });
          }).catch((err) => {
            console.log("Write to file failed");
            reject(err);
          });
        }, (err) => {
          console.log("Error creating file", err);
          reject(err);
        });
      });
    });

    return d;
  };

  public _sendObject(theFile: string, mediaType: string, objectType?: string, objectSubtype?: string): Promise<any> {
    const options: FileUploadOptions = {
      fileName: theFile,
      mimeType: mediaType,
      fileKey: "file",
      httpMethod: "POST",
      params: {
        token: this.userData.Token,
        mediaType: mediaType,
        subscriberID: this.subscriber.subInfo.subscriberID,
        type: objectType,
        subtype: objectSubtype,
        userID: this.userData.effectiveUserID ? this.userData.effectiveUserID : this.userData.userID
      }
    };

    const fileTransfer: FileTransferObject = this.transfer.create();
    // call the upload method to pass the object
    const uploadUrl = this.comms.serviceHost + this.comms.uploadPath;

    return fileTransfer.upload(theFile, encodeURI(uploadUrl), options).then((result: any) => {
      const tempJson: any = JSON.parse(result.response);
      const newObjectID: number = tempJson.objectID;
      tempJson.localFile = theFile;
      console.log("Blob Uploaded to objectID " + newObjectID);
      return tempJson;
    }).catch((error: any) => {
      console.log("upload error source " + error.code);
      return new Promise((resolve, reject) => {
        this.alertController.create({
          header: 'Transfer of the picture failed.',
          cssClass: 'custom-alert',
          backdropDismiss: false,
          buttons: [
            {
              text: 'Try again',
              handler: () => {
                this._sendObject(theFile, mediaType, objectType, objectSubtype).then((res) => {
                  resolve(res);
                }).catch((er) => {
                  reject(er);
                });
              }
            },
            {
              text: 'Cancel',
              handler: () => reject(error)
            }
          ]
        }).then((el: HTMLIonAlertElement) => {
          el.present();
        });
      });
    });
  }

}
