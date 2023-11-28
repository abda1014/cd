-- Copyright (C) 2023 - present Juergen Zimmermann, Hochschule Karlsruhe
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

-- "Konzeption und Realisierung eines aktiven Datenbanksystems"
-- "Verteilte Komponenten und Datenbankanbindung"
-- "Design Patterns"
-- "Freiburger Chorcd"
-- "Maschinelle Lernverfahren zur Behandlung von Bonitätsrisiken im Mobilfunkgeschäft"
-- "Software Pioneers"

INSERT INTO cd(id, version, isrc, bewertung, genre, preis, skonto, verfuegbar, erscheinungsdatum, interpret, erzeugt, aktualisiert) VALUES
    (1,0,'DEUU41600001',4,'HIPHOP',11.1,0.011,true,'2022-02-01','Falco','2022-02-01 00:00:00','2022-02-01 00:00:00');
INSERT INTO cd(id, version, isrc, bewertung, genre, preis, skonto, verfuegbar, erscheinungsdatum, interpret,  erzeugt, aktualisiert) VALUES
    (20,0,'DEUU41600001',2,'ROCK',22.2,0.022,true,'2022-02-02','Mali','2022-02-02 00:00:00','2022-02-02 00:00:00');
INSERT INTO cd(id, version, isrc, bewertung, genre, preis, skonto, verfuegbar, erscheinungsdatum, interpret,  erzeugt, aktualisiert) VALUES
    (30,0,'DEUU41600002',3,'HIPHOP',33.3,0.033,true,'2022-02-03','2PAC','2022-02-03 00:00:00','2022-02-03 00:00:00');
INSERT INTO cd(id, version, isrc, bewertung, genre, preis, skonto, verfuegbar, erscheinungsdatum, interpret,  erzeugt, aktualisiert) VALUES
    (40,0,'DEUU41600003',4,'HIPHOP',44.4,0.044,true,'2022-02-04','Mark Forster','2022-02-04 00:00:00','2022-02-04 00:00:00');
INSERT INTO cd(id, version, isrc, bewertung, genre, preis, skonto, verfuegbar, erscheinungsdatum, interpret,  erzeugt, aktualisiert) VALUES
    (50,0,'DEUU41600004',2,'ROCK',55.5,0.055,true,'2022-02-05','Santana','2022-02-05 00:00:00','2022-02-05 00:00:00');
INSERT INTO cd(id, version, isrc, bewertung, genre, preis, skonto, verfuegbar, erscheinungsdatum, interpret,  erzeugt, aktualisiert) VALUES
    (60,0,'DEUU41600005',1,'ROCK',66.6,0.066,true,'2022-02-06','Lil UZi','2022-02-06 00:00:00','2022-02-06 00:00:00');

INSERT INTO titel(id, titel, untertitel, cd_id) VALUES
    (1,'Abbey Road','1969',1);
INSERT INTO titel(id, titel, untertitel, cd_id) VALUES
    (20,'Rubber Soul',null,20);
INSERT INTO titel(id, titel, untertitel, cd_id) VALUES
    (30,'Revolver','null',30);
INSERT INTO titel(id, titel, untertitel, cd_id) VALUES
    (40,'Help','null',40);
INSERT INTO titel(id, titel, untertitel, cd_id) VALUES
    (50,'Wassup','epsilon',50);
INSERT INTO titel(id, titel, untertitel, cd_id) VALUES
    (60,'Phi','Hallo',60);

INSERT INTO lied(id, lied_Titel, laenge, cd_id) VALUES
    (1,'Comeback','3',1);
INSERT INTO lied(id, lied_Titel, laenge, cd_id) VALUES
    (20,'Comeback','3',20);
INSERT INTO lied(id, lied_Titel, laenge, cd_id) VALUES
    (21,'Ransom','3',20);
INSERT INTO lied(id, lied_Titel, laenge, cd_id) VALUES
    (30,'Comeback','3',30);
INSERT INTO lied(id, lied_Titel, laenge, cd_id) VALUES
    (31,'Ransom','3',30);
INSERT INTO lied(id, lied_Titel, laenge, cd_id) VALUES
    (40,'Comeback','3',40);
INSERT INTO lied(id, lied_Titel, laenge, cd_id) VALUES
    (50,'Comeback','3',50);
INSERT INTO lied(id, lied_Titel, laenge, cd_id) VALUES
    (60,'Comeback','3',60);
