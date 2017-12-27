import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';



import { SocketIoModule, SocketIoConfig } from 'ng-socket-io';
import { NgChatModule } from './ng-chat/ng-chat.module';

const config: SocketIoConfig = { url: 'http://localhost:3000', options: {} };

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    NgChatModule,
    // tslint:disable-next-line:no-trailing-whitespace
    SocketIoModule.forRoot(config) 
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
