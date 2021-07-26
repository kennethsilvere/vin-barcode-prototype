import { Component, OnInit } from '@angular/core';
import Quagga from 'quagga';
import * as $ from 'jquery';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  scannerIsRunning = false;
  value: string;
  isError = false;
  scannedVinNumber;

  onError(error) {
    console.error(error);
    this.isError = true;
  }

  orderByOccurence(arr) {
    var counts = {};
    arr.forEach(function (value) {
      if (!counts[value]) {
        counts[value] = 0;
      }
      counts[value]++;
    });

    let getSortParameters = (curKey, nextKey) => {
      if (counts[curKey] < counts[nextKey]) {
        return -1;
      }
      if (counts[curKey] > counts[nextKey]) {
        return 1;
      }
      return 0;
    };

    return Object.keys(counts).sort((a, b) => getSortParameters(a, b));
  }

  constructor() {}

  ngOnInit() {
    this.load_quagga();
  }

  load_quagga() {
    if (
      $('#barcode-scanner').length > 0 &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    ) {
      Quagga.initialized = undefined;
      this.scannedVinNumber = undefined;
      const self = this;

      var last_result = [];
      if (Quagga.initialized == undefined) {
        Quagga.onDetected(function (result) {
          var last_code = result.codeResult.code;
          last_result.push(last_code);
          if (last_result.length > 20) {
            let code = self.orderByOccurence(last_result);
            self.scannedVinNumber = code[0];
            console.log(code);
            last_result = [];
            Quagga.stop();
          }
        });
      }

      Quagga.init(
        {
          inputStream: {
            name: 'Live',

            type: 'LiveStream',
            numOfWorkers: navigator.hardwareConcurrency,
            target: document.querySelector('#barcode-scanner'),
          },
          decoder: {
            readers: ['code_39_reader', 'code_39_vin_reader', 'codabar_reader'],
          },
        },
        function (err) {
          if (err) {
            console.log(err);
            return;
          }
          Quagga.initialized = true;
          Quagga.start();
          $('canvas').css('height', 0);
          $('video').css('width', '95vw');
          $('video').css('borderRadius', '2%');
          self.getStream();
        }
      );
    }
  }

  getUserMedia(options, successCallback, failureCallback) {
    var api = navigator.getUserMedia;
    if (api) {
      return api.bind(navigator)(options, successCallback, failureCallback);
    }
  }

  theStream;

  getStream() {
    if (!navigator.getUserMedia) {
      alert('User Media API not supported.');
      return;
    }

    var constraints = {
      video: true,
    };

    this.getUserMedia(
      constraints,
      function (stream) {
        let mediaControl: any = document.querySelector('video');
        if ('srcObject' in mediaControl) {
          mediaControl.srcObject = stream;
        } else {
          mediaControl.src = (window.URL || window.webkitURL).createObjectURL(
            stream
          );
        }
        this.theStream = stream;
      },
      function (err) {
        alert('Error: ' + err);
      }
    );
  }
}
