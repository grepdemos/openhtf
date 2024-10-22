/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Component representing the UserInput plug.
 */

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { trigger } from '@angular/animations';
import { Headers, Http, RequestOptions, Response } from '@angular/http';


import { ConfigService } from '../../core/config.service';
import { FlashMessageService } from '../../core/flash-message.service';
import { Station } from '../../shared/models/station.model';
import { TestState, TestStatus } from '../../shared/models/test-state.model';
import { washIn } from '../../shared/animations';
import { getStationBaseUrl, messageFromErrorResponse } from '../../shared/util';

export class TestSelectedEvent {
  constructor(public test: TestState) {}
}

@Component({
  animations: [trigger('animateIn', washIn)],
  selector: 'htf-test-control',
  templateUrl: './test-control.component.html',
  styleUrls: ['./test-control.component.scss'],
})
export class TestControlComponent implements OnInit {
  @Input() test: TestState;
  @Input() station: Station;
  @Output() onSelectTest = new EventEmitter<TestSelectedEvent>();

  options: RequestOptions
  stationBaseUrl: string

  tests: string[] = [];
  filteredTests: string[] = [];
  searchText = '';
  selectedValue = '';
  hoveredItem: string | null = null;
  isDropdownOpen = false;

  constructor(
    protected config: ConfigService,
    protected http: Http, protected flashMessage: FlashMessageService) {
      let headers = new Headers({'Content-Type': 'application/json'});
      this.options = new RequestOptions({headers});
      this.stationBaseUrl = getStationBaseUrl(this.config.dashboardEnabled, this.station);
    }

  testRunning(): boolean {
    return this.test && this.test.status === TestStatus.running;
  }

  hasTests(): boolean {
    return this.tests.length !== 0;
  }

  ngOnInit() {
    this.getTests();
  }

  filterItems() {
    if (this.searchText === '') {
      this.filteredTests = this.tests.slice();
    } else {
      this.filteredTests = this.tests.filter(item => item.toLowerCase().includes(this.searchText.toLowerCase()));
    }
  }

  selectItem(item: string) {
    this.searchText = item;
    this.selectedValue = item;
    this.isDropdownOpen = false;
  }

  onMouseEnter(item: string) {
    this.hoveredItem = item;
  }

  onMouseLeave() {
    this.hoveredItem = null;
  }

  protected getTests() {
    const testsUrl = `${this.stationBaseUrl}/list_tests`;

    this.http.get(testsUrl, this.options).subscribe((resp: Response) => {
      this.tests = resp.json().tests;
      this.filteredTests = this.tests.slice();
    });
  }

  protected startTest(test_name: string) {
    const testUrl = `${this.stationBaseUrl}/tests/${test_name}`;
    const payload = JSON.stringify({'method': 'remote_execute', 'kwargs': {}});

    this.http.post(testUrl, payload, this.options)
        .subscribe(() => {}, (error: Response) => {
          const tooltip = messageFromErrorResponse(error);
          this.flashMessage.error(
              `An error occurred trying to start test ${test_name}`,
              tooltip);
        });
  }

  abort() {
    const abortUrl = `${this.stationBaseUrl}/abort`;

    this.http.post(abortUrl, this.options)
        .subscribe(() => {}, (error: Response) => {
          const tooltip = messageFromErrorResponse(error);
          this.flashMessage.error(
              `An error occurred trying to abort current test}`,
              tooltip);
        });
  }

  sendTestStart(input: HTMLInputElement) {
    this.onSelectTest.emit(new TestSelectedEvent(null));
    let response: string;
    response = input.value;
    input.value = '';
    this.startTest(response);
  }

}
