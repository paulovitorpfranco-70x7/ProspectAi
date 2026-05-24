import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './presentation/layout/header/header.component';
import { NavComponent } from './presentation/layout/nav/nav.component';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, NavComponent, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
